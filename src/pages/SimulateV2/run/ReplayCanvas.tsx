import { FC, PointerEvent as ReactPointerEvent, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Segmented, Spin, Tooltip } from "antd";
import { CompressOutlined, FullscreenOutlined } from "@ant-design/icons";
import { Layer, Shape, Stage } from "react-konva";
import { PrimitiveAtom, useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { drawCad } from "../editor/cadDraw";
import { Frame, drawBackground, drawNodes, drawPaths } from "../editor/drawing";
import { useCadGeometry, useHiddenMask } from "../io/dxf/cadLoader";
import { useCanvasColors, useElementSize, useHtmlImage } from "../editor/hooks";
import { contentBounds, fitView, zoomAt } from "../editor/viewMath";
import { nodeMap } from "../model/ops";
import { View, projectAtom } from "../state/editorAtoms";
import { RunOutcome, mapModeAtom, playTimeAtom, presentAtom, replayFocusAtom, replayViewAtom } from "../state/runAtoms";
import { STATE_ORDER, bucketOf, heatColor, isLoaded, stateColors } from "./colors";
import { fmtMinutes } from "./format";
import { drawDeadlock, drawHeat, drawHighlight, drawVehicles, posesAt, vehicleAt } from "./replayDraw";
import type { CameraApi } from "@/components/Fleet3D/Scene3D";
import Fleet3DBoundary from "@/components/Fleet3D/Fleet3DBoundary";
import { webglAvailable } from "@/components/Fleet3D/webgl";

// three.js 很大, 切到 3D 才載
const Replay3D = lazy(() => import("./Replay3D"));

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

/**
 * 回放 / 塞車熱點的地圖. present: 展示模式 (全螢幕) 裡用, 不顯示切換展示模式的按鈕,
 * 角落的東西由展示模式自己放.
 */
const ReplayCanvas: FC<{
  outcome: RunOutcome;
  backgroundUrl: string | null;
  present?: boolean;
  /** 平移縮放存在哪裡 (展示模式用自己的, 不跟結果頁的地圖搶) */
  viewAtom?: PrimitiveAtom<View | null>;
}> = ({ outcome, backgroundUrl, present = false, viewAtom = replayViewAtom }) => {
  const { t } = useTranslation();
  const store = useStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(wrapRef);
  const [storedView, setView] = useAtom(viewAtom);
  const [mode, setMode] = useAtom(mapModeAtom);
  const focus = useAtomValue(replayFocusAtom);
  const canvas = useCanvasColors();
  const image = useHtmlImage(backgroundUrl);
  const doc = outcome.doc;
  const result = outcome.result;
  const project = useAtomValue(projectAtom);
  const setPresent = useSetAtom(presentAtom);
  const cadGeom = useCadGeometry(project?.id, doc.cad).geometry;
  const cadHidden = useHiddenMask(cadGeom, doc.cad?.hiddenLayers);
  const colors = useMemo(() => stateColors(canvas.dark), [canvas.dark]);
  const [pan, setPan] = useState<{ sx: number; sy: number; view: View } | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const is3d = mode === "3d";
  /** 3D 也可以看熱點 (路線照等待時間上色) */
  const [heat3d, setHeat3d] = useState(false);
  const is3dRef = useRef(is3d);
  is3dRef.current = is3d;
  const cameraRef = useRef<CameraApi | null>(null);

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
      // 3D 的縮放由 3D 畫布自己處理
      if (is3dRef.current) return;
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
      if (doc.cad && cadGeom && cadHidden) drawCad(c, frame, doc.cad, cadGeom, cadHidden);
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
    [doc, image, cadGeom, cadHidden, frame, mode, pos, none, result, canvas.dark, highlight],
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
      // 3D 的拖曳交給 3D 畫布; 這裡的 setPointerCapture 會把滑鼠事件從畫布搶走
      style={{ background: canvas.paper, cursor: is3d ? undefined : pan ? "grabbing" : "grab" }}
      onPointerDown={is3d ? undefined : onPointerDown}
      onPointerMove={is3d ? undefined : onPointerMove}
      onPointerUp={() => setPan(null)}
      onPointerCancel={() => setPan(null)}
      onPointerLeave={() => setPointer(null)}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="simv2-replay-canvas"
    >
      {is3d && (
        <Fleet3DBoundary onUse2d={() => setMode("replay")}>
          <Replay3D outcome={outcome} backgroundUrl={backgroundUrl} apiRef={cameraRef} heat={heat3d} />
        </Fleet3DBoundary>
      )}
      {!is3d && width > 0 && height > 0 && (
        <Stage width={width} height={height} listening={false}>
          <Layer listening={false}>
            <Shape listening={false} sceneFunc={staticScene} />
          </Layer>
          {mode === "replay" && <VehicleLayer outcome={outcome} frame={frame} hover={hovered?.index ?? null} colors={colors} />}
        </Stage>
      )}
      <Corner style={{ top: 10, left: 10 }} onPointerDown={(e) => e.stopPropagation()}>
        <Segmented<"replay" | "heat" | "3d">
          size="small"
          value={mode}
          onChange={setMode}
          options={[
            { value: "replay", label: t("sim_v2.result.map_replay") },
            { value: "heat", label: t("sim_v2.result.map_heat") },
            {
              value: "3d",
              label: t("sim_v2.result.map_3d"),
              disabled: !webglAvailable(),
              tooltip: webglAvailable() ? undefined : t("fleet3d.no_webgl"),
            },
          ]}
          data-testid="simv2-map-mode"
        />
        {is3d && (
          <Tooltip title={t("fleet3d.sim.heat_tip")}>
            <Checkbox checked={heat3d} onChange={(e) => setHeat3d(e.target.checked)} data-testid="simv2-3d-heat">
              {t("fleet3d.sim.heat")}
            </Checkbox>
          </Tooltip>
        )}
        <Tooltip title={t("sim_v2.result.fit")}>
          <Button
            size="small"
            type="text"
            icon={<CompressOutlined />}
            onClick={() => (is3d ? cameraRef.current?.reset() : setView(fitView(contentBounds(doc), width, height)))}
          />
        </Tooltip>
        {!present && (
          <Tooltip title={t("sim_v2.present.enter")}>
            <Button
              size="small"
              type="text"
              icon={<FullscreenOutlined />}
              onClick={() => setPresent(true)}
              aria-label={t("sim_v2.present.enter")}
              data-testid="simv2-present"
            />
          </Tooltip>
        )}
        {outcome.trace === "loading" && mode !== "heat" && (
          <span data-testid="simv2-trace-loading">
            <Spin size="small" /> {t("sim_v2.history.trace_loading")}
          </span>
        )}
      </Corner>
      <Corner style={{ bottom: 10, left: 10, maxWidth: "calc(100% - 20px)" }} onPointerDown={(e) => e.stopPropagation()} data-testid="simv2-map-legend">
        {mode !== "heat" ? (
          <>
            {STATE_ORDER.map((s) => (
              <Key key={s}>
                <i style={{ background: colors[s] }} />
                {t(`sim_v2.state.${s}`)}
              </Key>
            ))}
            {/* 3D 的貨直接畫成棧板, 不用白色方塊 */}
            {!is3d && (
              <Key>
                <i style={{ background: canvas.paper, border: "1px solid var(--c-text-muted)" }} />
                {t("sim_v2.result.loaded_mark")}
              </Key>
            )}
            {is3d && heat3d && maxHeat > 0 && (
              <Key>
                <i
                  style={{
                    width: 48,
                    background: `linear-gradient(to right, ${[0, 0.5, 1].map((k) => heatColor(k, canvas.dark)).join(",")})`,
                  }}
                />
                {t("sim_v2.result.heat_max", { min: fmtMinutes(maxHeat) })}
              </Key>
            )}
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
