import { FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Segmented, Tooltip } from "antd";
import { CompressOutlined } from "@ant-design/icons";
import { Layer, Shape, Stage } from "react-konva";
import { useAtom, useAtomValue, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Frame, drawBackground, drawNodes, drawPaths } from "../editor/drawing";
import { useCanvasColors, useElementSize, useHtmlImage } from "../editor/hooks";
import { contentBounds, fitView, zoomAt } from "../editor/viewMath";
import { nodeMap } from "../model/ops";
import { View } from "../state/editorAtoms";
import { RunOutcome, mapModeAtom, playTimeAtom, replayFocusAtom, replayViewAtom } from "../state/runAtoms";
import { STATE_ORDER, bucketOf, heatColor, isLoaded, stateColors } from "./colors";
import { fmtMinutes } from "./format";
import { drawDeadlock, drawHeat, drawHighlight, drawVehicles, posesAt, vehicleAt } from "./replayDraw";

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
`;

const Corner = styled.div`
  position: absolute;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  padding: 6px 10px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  font-size: 12px;
  color: var(--c-text-secondary);
  pointer-events: auto;
`;

const Key = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;

  i {
    display: inline-block;
    width: 12px;
    height: 8px;
    border-radius: 2px;
  }
`;

const Tip = styled.div`
  position: absolute;
  z-index: 2;
  padding: 6px 10px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  font-size: 12px;
  color: var(--c-text);
  pointer-events: none;
  white-space: nowrap;
`;

/** 車的那一層: 跟著播放時間重畫 (地圖那一層不用) */
const VehicleLayer: FC<{ outcome: RunOutcome; frame: Frame; hover: number | null; colors: ReturnType<typeof stateColors> }> = ({
  outcome,
  frame,
  hover,
  colors,
}) => {
  const t = useAtomValue(playTimeAtom);
  const trace = outcome.result.trace;
  return (
    <Layer listening={false}>
      <Shape
        listening={false}
        sceneFunc={(ctx) => {
          if (!trace) return;
          drawVehicles(ctx._context, frame, posesAt(trace, t), colors, hover);
        }}
      />
    </Layer>
  );
};

const ReplayCanvas: FC<{ outcome: RunOutcome; backgroundUrl: string | null }> = ({ outcome, backgroundUrl }) => {
  const { t } = useTranslation();
  const store = useStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(wrapRef);
  const [storedView, setView] = useAtom(replayViewAtom);
  const [mode, setMode] = useAtom(mapModeAtom);
  const focus = useAtomValue(replayFocusAtom);
  const canvas = useCanvasColors();
  const image = useHtmlImage(backgroundUrl);
  const doc = outcome.doc;
  const result = outcome.result;
  const colors = useMemo(() => stateColors(canvas.dark), [canvas.dark]);
  const [pan, setPan] = useState<{ sx: number; sy: number; view: View } | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  // 第一次 (或換了結果) 縮放到全部看得到
  useEffect(() => {
    if (!storedView && width > 0 && height > 0) setView(fitView(contentBounds(doc), width, height));
  }, [storedView, width, height, doc, setView]);
  const view = storedView ?? { x: 0, y: 0, scale: 10 };

  // 要看某個地方 (熱點、站點、死結): 移過去, 太小就放大
  useEffect(() => {
    if (!focus || width <= 0) return;
    setView((v) => {
      const scale = Math.max(v?.scale ?? 10, 8);
      return { scale, x: width / 2 - focus.x * scale, y: height / 2 + focus.y * scale };
    });
  }, [focus, width, height, setView]);

  // 滾輪縮放
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
      setView((v) => (v ? zoomAt(v, e.clientX - rect.left, e.clientY - rect.top, factor) : v));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView]);

  const nodesById = useMemo(() => nodeMap(doc), [doc]);
  const pos = useCallback((id: string) => nodesById.get(id), [nodesById]);
  const frame: Frame = useMemo(() => ({ view, width, height, colors: canvas }), [view, width, height, canvas]);
  const none = useMemo(() => new Set<string>(), []);
  const highlight = focus?.ids ?? null;

  const drawStatic = useCallback(
    (c: CanvasRenderingContext2D) => {
      if (doc.background && image) drawBackground(c, frame, doc.background, image);
      if (mode === "heat") {
        c.globalAlpha = 0.45;
        drawPaths(c, frame, doc, pos, none);
        c.globalAlpha = 1;
        drawHeat(c, frame, doc, pos, result.heat, canvas.dark);
        drawNodes(c, frame, { ...doc, nodes: doc.nodes.filter((n) => n.kind !== "point") }, pos, none, true);
      } else {
        drawPaths(c, frame, doc, pos, none);
        drawNodes(c, frame, doc, pos, none, true);
      }
      if (highlight) drawHighlight(c, frame, doc, pos, highlight);
      if (result.deadlock) drawDeadlock(c, frame, result.deadlock);
    },
    [doc, image, frame, mode, pos, none, result, canvas.dark, highlight],
  );
  // 同一個函式就不重畫 (播放時只有車那一層在動)
  const staticScene = useCallback((ctx: { _context: CanvasRenderingContext2D }) => drawStatic(ctx._context), [drawStatic]);

  // 滑鼠下面的車 (用目前的播放時間算)
  const hovered = useMemo(() => {
    if (!pointer || mode !== "replay" || !result.trace) return null;
    const poses = posesAt(result.trace, store.get(playTimeAtom));
    const i = vehicleAt(frame, poses, pointer.x, pointer.y);
    return i === null ? null : poses[i];
  }, [pointer, mode, result.trace, frame, store]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPan({ sx: e.clientX - rect.left, sy: e.clientY - rect.top, view });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (pan) setView({ ...pan.view, x: pan.view.x + sx - pan.sx, y: pan.view.y + sy - pan.sy });
    else setPointer({ x: sx, y: sy });
  };

  const maxHeat = Math.max(0, ...Object.values(result.heat.paths), ...Object.values(result.heat.nodes));

  return (
    <Wrap
      ref={wrapRef}
      style={{ background: canvas.paper, cursor: pan ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => setPan(null)}
      onPointerCancel={() => setPan(null)}
      onPointerLeave={() => setPointer(null)}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="simv2-replay-canvas"
    >
      {width > 0 && height > 0 && (
        <Stage width={width} height={height} listening={false}>
          <Layer listening={false}>
            <Shape listening={false} sceneFunc={staticScene} />
          </Layer>
          {mode === "replay" && <VehicleLayer outcome={outcome} frame={frame} hover={hovered?.index ?? null} colors={colors} />}
        </Stage>
      )}
      <Corner style={{ top: 10, left: 10 }} onPointerDown={(e) => e.stopPropagation()}>
        <Segmented<"replay" | "heat">
          size="small"
          value={mode}
          onChange={setMode}
          options={[
            { value: "replay", label: t("sim_v2.result.map_replay") },
            { value: "heat", label: t("sim_v2.result.map_heat") },
          ]}
          data-testid="simv2-map-mode"
        />
        <Tooltip title={t("sim_v2.result.fit")}>
          <Button size="small" type="text" icon={<CompressOutlined />} onClick={() => setView(fitView(contentBounds(doc), width, height))} />
        </Tooltip>
      </Corner>
      <Corner style={{ bottom: 10, left: 10, maxWidth: "calc(100% - 20px)" }} onPointerDown={(e) => e.stopPropagation()} data-testid="simv2-map-legend">
        {mode === "replay" ? (
          <>
            {STATE_ORDER.map((s) => (
              <Key key={s}>
                <i style={{ background: colors[s] }} />
                {t(`sim_v2.state.${s}`)}
              </Key>
            ))}
            <Key>
              <i style={{ background: canvas.paper, border: "1px solid var(--c-text-muted)" }} />
              {t("sim_v2.result.loaded_mark")}
            </Key>
          </>
        ) : maxHeat > 0 ? (
          <>
            <span>{t("sim_v2.result.heat_legend")}</span>
            <span>0</span>
            <span
              style={{
                width: 120,
                height: 8,
                borderRadius: 4,
                background: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map((k) => heatColor(k, canvas.dark)).join(",")})`,
              }}
            />
            <span>{t("sim_v2.result.heat_max", { min: fmtMinutes(maxHeat) })}</span>
          </>
        ) : (
          <span>{t("sim_v2.result.heat_none")}</span>
        )}
      </Corner>
      {hovered && pointer && (
        <Tip style={{ left: Math.min(pointer.x + 14, width - 180), top: Math.max(4, pointer.y - 40) }} data-testid="simv2-vehicle-tip">
          <b>{hovered.name}</b>
          <span style={{ marginLeft: 8 }}>{t(`sim_v2.state.${bucketOf(hovered.state)}`)}</span>
          {isLoaded(hovered.state) && <span style={{ marginLeft: 8 }}>{t("sim_v2.result.loaded")}</span>}
        </Tip>
      )}
    </Wrap>
  );
};

export default ReplayCanvas;
