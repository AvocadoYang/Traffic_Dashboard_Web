import { FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Shape, Stage } from "react-konva";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import styled from "styled-components";
import { constrainAngle, snapToGrid } from "../model/geometry";
import { addSegment, findNodeNear, findPathNear, moveNodes, nodeMap } from "../model/ops";
import { Point, SimDoc } from "../model/types";
import {
  EMPTY_SELECTION,
  View,
  calibrationAtom,
  commitAtom,
  cursorAtom,
  docAtom,
  fitRequestAtom,
  layersAtom,
  measureAtom,
  pathDraftAtom,
  selectionAtom,
  toolAtom,
  viewAtom,
} from "../state/editorAtoms";
import { Frame, Overlay, drawBackground, drawGrid, drawNodes, drawOverlay, drawPaths } from "./drawing";
import { useCanvasColors, useElementSize, useHtmlImage } from "./hooks";
import { NODE_HIT_PX, PATH_HIT_PX, Target, materialize, resolveTarget } from "./targeting";
import { backgroundBounds, contentBounds, fitView, toWorld, zoomAt } from "./viewMath";

type Interaction =
  | { kind: "pan"; sx: number; sy: number; view: View; button: number }
  | {
      kind: "move";
      ids: string[];
      origin: Map<string, Point>;
      anchor: Point;
      start: Point;
      downAt: Point;
      delta: Point;
      started: boolean;
    }
  | { kind: "box"; a: Point; b: Point; additive: boolean; downAt: Point }
  | { kind: "background"; start: Point; delta: Point };

/** 按下去之後移動超過幾個像素才算拖曳 (不然只是點一下) */
const DRAG_THRESHOLD_PX = 4;

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
`;

const sameTarget = (d: Target | null, doc: SimDoc): Target | null => {
  if (!d) return null;
  if (d.kind === "node") {
    const n = doc.nodes.find((x) => x.id === d.id);
    return n ? { ...d, point: { x: n.x, y: n.y } } : { kind: "free", point: d.point };
  }
  return d;
};

const EditorCanvas: FC<{ backgroundUrl: string | null }> = ({ backgroundUrl }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(wrapRef);
  const doc = useAtomValue(docAtom);
  const [view, setView] = useAtom(viewAtom);
  const tool = useAtomValue(toolAtom);
  const [selection, setSelection] = useAtom(selectionAtom);
  const commit = useSetAtom(commitAtom);
  const layers = useAtomValue(layersAtom);
  const setCursor = useSetAtom(cursorAtom);
  const [measure, setMeasure] = useAtom(measureAtom);
  const [calibration, setCalibration] = useAtom(calibrationAtom);
  const [draftRaw, setDraft] = useAtom(pathDraftAtom);
  const fitRequest = useAtomValue(fitRequestAtom);
  const colors = useCanvasColors();
  const image = useHtmlImage(backgroundUrl);

  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [shift, setShift] = useState(false);
  const [space, setSpace] = useState(false);

  const draft = useMemo(() => sameTarget(draftRaw, doc), [draftRaw, doc]);

  // Shift: 畫線鎖 45 度; 空白鍵: 按住拖曳平移
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShift(true);
      if (e.code === "Space" && !isTyping(e)) setSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShift(false);
      if (e.code === "Space") setSpace(false);
    };
    const blur = () => {
      setShift(false);
      setSpace(false);
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // 縮放到全部看得到: 換專案時、按「全部」時. 畫布還沒量到尺寸就等量到再做
  const pendingFit = useRef(true);
  useEffect(() => {
    pendingFit.current = true;
  }, [fitRequest]);
  useEffect(() => {
    if (pendingFit.current && width > 0 && height > 0) {
      pendingFit.current = false;
      setView(fitView(contentBounds(doc), width, height));
    }
  }, [fitRequest, width, height, doc, setView]);

  // 滾輪縮放 (要能 preventDefault, 所以不用 React 的 onWheel)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
      setView((v) => zoomAt(v, e.clientX - rect.left, e.clientY - rect.top, factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView]);

  const nodesById = useMemo(() => nodeMap(doc), [doc]);
  const pos = useCallback(
    (id: string): Point | undefined => {
      const n = nodesById.get(id);
      if (!n) return undefined;
      if (interaction?.kind === "move" && interaction.origin.has(id)) {
        return { x: n.x + interaction.delta.x, y: n.y + interaction.delta.y };
      }
      return n;
    },
    [nodesById, interaction],
  );

  const selectedNodes = useMemo(() => new Set(selection.nodeIds), [selection.nodeIds]);
  const selectedPaths = useMemo(() => new Set(selection.pathIds), [selection.pathIds]);

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  /** 畫路線時滑鼠的位置: 按住 Shift 鎖角度 */
  const pathRaw = (world: Point) => (shift && draft ? constrainAngle(draft.point, world) : world);

  const insideBackground = (p: Point) => {
    const b = backgroundBounds(doc);
    return !!b && p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = local(e);
    const world = toWorld(view, s.x, s.y);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    if (e.button === 1 || e.button === 2 || (e.button === 0 && space)) {
      setInteraction({ kind: "pan", sx: s.x, sy: s.y, view, button: e.button });
      return;
    }
    if (e.button !== 0) return;
    const opts = { snap: doc.editor.snap };

    switch (tool) {
      case "select": {
        const node = findNodeNear(doc, world, NODE_HIT_PX / view.scale);
        if (node) {
          let ids = selection.nodeIds;
          if (e.shiftKey) {
            ids = ids.includes(node.id) ? ids.filter((id) => id !== node.id) : [...ids, node.id];
            setSelection({ nodeIds: ids, pathIds: selection.pathIds });
          } else if (!ids.includes(node.id)) {
            ids = [node.id];
            setSelection({ nodeIds: ids, pathIds: [] });
          }
          if (ids.includes(node.id)) {
            const origin = new Map<string, Point>();
            for (const id of ids) {
              const n = nodesById.get(id);
              if (n) origin.set(id, { x: n.x, y: n.y });
            }
            setInteraction({
              kind: "move",
              ids,
              origin,
              anchor: { x: node.x, y: node.y },
              start: world,
              downAt: s,
              delta: { x: 0, y: 0 },
              started: false,
            });
          }
          return;
        }
        const hit = findPathNear(doc, world, PATH_HIT_PX / view.scale);
        if (hit) {
          const id = hit.path.id;
          if (e.shiftKey) {
            const has = selection.pathIds.includes(id);
            setSelection({
              nodeIds: selection.nodeIds,
              pathIds: has ? selection.pathIds.filter((x) => x !== id) : [...selection.pathIds, id],
            });
          } else {
            setSelection({ nodeIds: [], pathIds: [id] });
          }
          return;
        }
        if (layers.background && doc.background && !doc.background.locked && insideBackground(world) && !e.shiftKey) {
          setInteraction({ kind: "background", start: world, delta: { x: 0, y: 0 } });
          return;
        }
        setInteraction({ kind: "box", a: world, b: world, additive: e.shiftKey, downAt: s });
        return;
      }
      case "point":
      case "station":
      case "standby": {
        const target = resolveTarget(doc, world, view.scale, opts);
        let id = "";
        commit((d) => {
          const r = materialize(d, target, tool === "point" ? undefined : tool);
          id = r.id;
          return r.doc;
        });
        if (id) setSelection({ nodeIds: [id], pathIds: [] });
        return;
      }
      case "path": {
        const end = resolveTarget(doc, pathRaw(world), view.scale, opts);
        if (!draft) {
          setDraft(end);
          return;
        }
        let endId = "";
        let endPoint = end.point;
        commit((d) => {
          // 起點、終點都在同一份 doc 上重新對一次: 起點可能切了一條路線, 終點原本對到的路線 id 就變了
          const start = materialize(d, draft.kind === "free" ? draft : resolveTarget(d, draft.point, view.scale, opts));
          const stop = materialize(start.doc, resolveTarget(start.doc, end.point, view.scale, opts));
          endId = stop.id;
          const n = stop.doc.nodes.find((x) => x.id === stop.id);
          if (n) endPoint = { x: n.x, y: n.y };
          return addSegment(stop.doc, start.id, stop.id, d.editor.defaultDirection).doc;
        });
        setDraft(endId ? { kind: "node", id: endId, point: endPoint } : null);
        return;
      }
      case "measure": {
        const p = resolveTarget(doc, world, view.scale, { snap: doc.editor.snap, usePaths: false }).point;
        setMeasure(!measure.a || measure.b ? { a: p, b: null } : { a: measure.a, b: p });
        return;
      }
      case "calibrate": {
        setCalibration(!calibration.a || calibration.b ? { a: world, b: null } : { a: calibration.a, b: world });
        return;
      }
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = local(e);
    const world = toWorld(view, s.x, s.y);
    setCursor(world);
    setHover(world);
    const it = interaction;
    if (!it) return;
    if (it.kind === "pan") {
      setView({ ...it.view, x: it.view.x + s.x - it.sx, y: it.view.y + s.y - it.sy });
    } else if (it.kind === "move") {
      const started = it.started || Math.hypot(s.x - it.downAt.x, s.y - it.downAt.y) > DRAG_THRESHOLD_PX;
      if (!started) return;
      let anchor = { x: it.anchor.x + world.x - it.start.x, y: it.anchor.y + world.y - it.start.y };
      if (doc.editor.snap) anchor = snapToGrid(anchor, doc.editor.gridSize);
      setInteraction({ ...it, started, delta: { x: anchor.x - it.anchor.x, y: anchor.y - it.anchor.y } });
    } else if (it.kind === "box") {
      setInteraction({ ...it, b: world });
    } else if (it.kind === "background") {
      setInteraction({ ...it, delta: { x: world.x - it.start.x, y: world.y - it.start.y } });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const it = interaction;
    setInteraction(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!it) return;
    const s = local(e);
    if (it.kind === "pan") {
      // 右鍵點一下 (沒有拖) 結束目前這一串路線
      if (it.button === 2 && Math.hypot(s.x - it.sx, s.y - it.sy) < DRAG_THRESHOLD_PX && tool === "path") setDraft(null);
      return;
    }
    if (it.kind === "move") {
      if (!it.started || (it.delta.x === 0 && it.delta.y === 0)) return;
      const positions = new Map<string, Point>();
      it.origin.forEach((p, id) => positions.set(id, { x: p.x + it.delta.x, y: p.y + it.delta.y }));
      commit((d) => moveNodes(d, positions));
      return;
    }
    if (it.kind === "background") {
      if (it.delta.x === 0 && it.delta.y === 0) return;
      commit((d) =>
        d.background
          ? { ...d, background: { ...d.background, originX: d.background.originX + it.delta.x, originY: d.background.originY + it.delta.y } }
          : d,
      );
      return;
    }
    // 框選
    if (Math.hypot(s.x - it.downAt.x, s.y - it.downAt.y) < DRAG_THRESHOLD_PX) {
      if (!it.additive) setSelection(EMPTY_SELECTION);
      return;
    }
    const minX = Math.min(it.a.x, it.b.x);
    const maxX = Math.max(it.a.x, it.b.x);
    const minY = Math.min(it.a.y, it.b.y);
    const maxY = Math.max(it.a.y, it.b.y);
    const nodeIds = doc.nodes.filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY).map((n) => n.id);
    const inside = new Set(nodeIds);
    const pathIds = doc.paths.filter((p) => inside.has(p.from) && inside.has(p.to)).map((p) => p.id);
    if (it.additive) {
      setSelection({
        nodeIds: [...new Set([...selection.nodeIds, ...nodeIds])],
        pathIds: [...new Set([...selection.pathIds, ...pathIds])],
      });
    } else {
      setSelection({ nodeIds, pathIds });
    }
  };

  const overlay = useMemo<Overlay>(() => {
    const o: Overlay = {
      box: interaction?.kind === "box" ? { a: interaction.a, b: interaction.b } : null,
      draftLine: null,
      target: null,
      hoverNode: null,
      hoverPath: null,
      measure: null,
      calibration: null,
    };
    if (measure.a) {
      const b = measure.b ?? (tool === "measure" && hover ? resolveTarget(doc, hover, view.scale, { snap: doc.editor.snap, usePaths: false }).point : null);
      if (b) o.measure = { a: measure.a, b };
    }
    if (tool === "calibrate" && calibration.a) o.calibration = { a: calibration.a, b: calibration.b ?? hover };
    if (!hover || interaction) return o;
    const opts = { snap: doc.editor.snap };
    if (tool === "point" || tool === "station" || tool === "standby") {
      o.target = resolveTarget(doc, hover, view.scale, opts);
    } else if (tool === "path") {
      o.target = resolveTarget(doc, pathRaw(hover), view.scale, opts);
      if (draft) o.draftLine = { from: draft.point, to: o.target.point };
    } else if (tool === "select") {
      const node = findNodeNear(doc, hover, NODE_HIT_PX / view.scale);
      if (node) o.hoverNode = { x: node.x, y: node.y };
      else {
        const hit = findPathNear(doc, hover, PATH_HIT_PX / view.scale);
        const a = hit && nodesById.get(hit.path.from);
        const b = hit && nodesById.get(hit.path.to);
        if (a && b) o.hoverPath = { a, b };
      }
    }
    return o;
    // pathRaw 只依賴 shift / draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interaction, measure, calibration, tool, hover, doc, view.scale, draft, shift, nodesById]);

  const frame: Frame = { view, width, height, colors };
  const bgOffset = interaction?.kind === "background" ? interaction.delta : undefined;

  let cursor = "default";
  if (interaction?.kind === "pan") cursor = "grabbing";
  else if (space) cursor = "grab";
  else if (interaction?.kind === "move" || interaction?.kind === "background") cursor = "move";
  else if (tool !== "select") cursor = "crosshair";
  else if (overlay.hoverNode) cursor = "pointer";

  return (
    <Wrap
      ref={wrapRef}
      style={{ cursor, background: colors.paper }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setInteraction(null)}
      onPointerLeave={() => {
        setHover(null);
        setCursor(null);
      }}
      onDoubleClick={() => tool === "path" && setDraft(null)}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="simv2-canvas"
    >
      {width > 0 && height > 0 && (
        <Stage width={width} height={height} listening={false}>
          <Layer listening={false}>
            <Shape
              listening={false}
              sceneFunc={(ctx) => {
                const c = ctx._context;
                if (layers.background && doc.background && image) drawBackground(c, frame, doc.background, image, bgOffset);
                if (layers.grid) drawGrid(c, frame, doc.editor.gridSize);
                if (layers.paths) drawPaths(c, frame, doc, pos, selectedPaths);
                if (layers.nodes) drawNodes(c, frame, doc, pos, selectedNodes, layers.labels);
              }}
            />
          </Layer>
          <Layer listening={false}>
            <Shape listening={false} sceneFunc={(ctx) => drawOverlay(ctx._context, frame, overlay)} />
          </Layer>
        </Stage>
      )}
    </Wrap>
  );
};

export default EditorCanvas;
