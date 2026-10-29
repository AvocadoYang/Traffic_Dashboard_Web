import { FC, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useAtomValue, useStore } from "jotai";
import { themeAtom } from "@/theme";
import Scene3D, { CameraApi, ModelBoundary } from "@/components/Fleet3D/Scene3D";
import MapGround from "@/components/Fleet3D/MapGround";
import { Dot, Dots3D, Roads3D, Segment } from "@/components/Fleet3D/MapLayers3D";
import Vehicle3D from "@/components/Fleet3D/Vehicle3D";
import { FORKLIFT_MODEL, VehicleModel, simVehicleModel } from "@/components/Fleet3D/vehicleModels";
import useRobotType from "@/api/useRobotType";
import { VehicleFrame, emptyFrame } from "@/components/Fleet3D/frame";
import VehicleLabel from "@/components/Fleet3D/VehicleLabel";
import FollowChip from "@/components/Fleet3D/FollowChip";
import { STATION_COLORS, useCanvasColors } from "../editor/hooks";
import { contentBounds } from "../editor/viewMath";
import { useCadGeometry, useHiddenMask } from "../io/dxf/cadLoader";
import { nodeMap } from "../model/ops";
import { projectAtom } from "../state/editorAtoms";
import { RunOutcome, playTimeAtom, replayFocusAtom } from "../state/runAtoms";
import CadLines3D from "./CadLines3D";
import { DEADLOCK_COLOR, bucketOf, heatColor, stateColors } from "./colors";
import { forkAt, forkWorkOf } from "./forkTimeline";
import { VehiclePose, posesAt } from "./replayDraw";

/**
 * 回放的 3D 版: 模擬的佈局鋪在地上, 車照軌跡跑; 取貨、放貨時牙叉升降 (forkTimeline),
 * 載著貨時牙叉上有棧板。地上的色圈是車的狀態 (顏色跟 2D 回放、圖例一樣)。點車: 鏡頭跟著那台車。
 * 跟 2D 一樣: heat 打開時路線照塞車等待的時間上色; 死結的地方畫紅圈; 結果頁點了熱點 / 站點時鏡頭飛過去、框起來。
 */

/** 結果頁點熱點 / 站點時, 鏡頭離那裡多遠 (公尺) */
const FOCUS_DISTANCE = 25;

/** 回放時間變了就畫下一幀 (畫布只在有東西變的時候畫, 見 Scene3D) */
const PlayTimeFrames: FC<{ store: ReturnType<typeof useStore> }> = ({ store }) => {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => store.sub(playTimeAtom, () => invalidate()), [store, invalidate]);
  return null;
};

const Replay3D: FC<{
  outcome: RunOutcome;
  backgroundUrl: string | null;
  apiRef?: MutableRefObject<CameraApi | null>;
  /** 路線照塞車等待的時間上色 (同 2D 的熱點) */
  heat?: boolean;
}> = ({ outcome, backgroundUrl, apiRef, heat = false }) => {
  const store = useStore();
  const canvas = useCanvasColors();
  const theme = useAtomValue(themeAtom);
  const doc = outcome.doc;
  const trace = outcome.result.trace;
  const colors = useMemo(() => stateColors(canvas.dark), [canvas.dark]);
  const bounds = useMemo(() => contentBounds(doc), [doc]);
  const work = useMemo(() => (trace ? forkWorkOf(trace) : []), [trace]);
  const project = useAtomValue(projectAtom);
  const cadGeom = useCadGeometry(project?.id, doc.cad).geometry;
  const cadHidden = useHiddenMask(cadGeom, doc.cad?.hiddenLayers);
  const [follow, setFollow] = useState<string | null>(null);
  const stopFollow = useCallback(() => setFollow(null), []);
  const { data: robotTypes } = useRobotType();
  // 車種名稱跟哪個車型一樣就用那個車型的模型 (沒有就是叉車), 大小照模擬的車長
  const models = useMemo<VehicleModel[]>(
    () =>
      (trace?.vehicles ?? []).map((v) => ({
        ...simVehicleModel(v.type ?? v.name, robotTypes?.filter((t): t is NonNullable<typeof t> => !!t)),
        fitLength: v.length > 0 ? v.length : undefined,
      })),
    [trace, robotTypes],
  );
  const modelsRef = useRef(models);
  modelsRef.current = models;

  const nodesById = useMemo(() => nodeMap(doc), [doc]);
  const segmentsOf = useCallback(
    (keep: (id: string) => boolean, color?: (id: string) => string) =>
      doc.paths.flatMap((p) => {
        const a = nodesById.get(p.from);
        const b = nodesById.get(p.to);
        return a && b && keep(p.id) ? [{ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: color?.(p.id) }] : [];
      }),
    [doc, nodesById],
  );
  const paths = useMemo<Segment[]>(() => segmentsOf(() => true), [segmentsOf]);

  // 熱點: 等待秒數 / 最大值 -> 色階 (同 2D 的 drawHeat)
  const heatMap = outcome.result.heat;
  const heatMax = useMemo(() => Math.max(1, ...Object.values(heatMap.paths), ...Object.values(heatMap.nodes)), [heatMap]);
  const heatPaths = useMemo<Segment[]>(
    () =>
      heat
        ? segmentsOf(
            (id) => (heatMap.paths[id] ?? 0) > 0,
            (id) => heatColor((heatMap.paths[id] ?? 0) / heatMax, canvas.dark),
          )
        : [],
    [heat, segmentsOf, heatMap, heatMax, canvas.dark],
  );
  const heatNodes = useMemo<Dot[]>(
    () =>
      heat
        ? Object.entries(heatMap.nodes).flatMap(([id, sec]) => {
            const n = nodesById.get(id);
            return n && sec > 0 ? [{ id, x: n.x, y: n.y, color: heatColor(sec / heatMax, canvas.dark) }] : [];
          })
        : [],
    [heat, heatMap, heatMax, nodesById, canvas.dark],
  );

  // 結果頁點了熱點 / 站點 / 死結: 鏡頭飛過去, 那些路線、站點框起來 (同 2D 的 drawHighlight)
  const focus = useAtomValue(replayFocusAtom);
  useEffect(() => {
    if (focus) apiRef?.current?.flyTo(focus.x, focus.y, FOCUS_DISTANCE);
  }, [focus, apiRef]);
  const highlightPaths = useMemo<Segment[]>(() => {
    const ids = new Set(focus?.ids ?? []);
    return ids.size ? segmentsOf((id) => ids.has(id)) : [];
  }, [focus, segmentsOf]);
  const highlightNodes = useMemo<Dot[]>(
    () =>
      (focus?.ids ?? []).flatMap((id) => {
        const n = nodesById.get(id);
        return n ? [{ id, x: n.x, y: n.y, color: canvas.accent }] : [];
      }),
    [focus, nodesById, canvas.accent],
  );
  const deadlock = outcome.result.deadlock;
  const stations = useMemo<Dot[]>(
    () =>
      doc.nodes
        .filter((n) => n.kind !== "point")
        .map((n) => ({ id: n.id, x: n.x, y: n.y, color: n.kind === "standby" ? canvas.standby : STATION_COLORS[n.station?.type ?? "both"] })),
    [doc, canvas],
  );
  const points = useMemo<Dot[]>(
    () => doc.nodes.filter((n) => n.kind === "point").map((n) => ({ id: n.id, x: n.x, y: n.y, color: canvas.point })),
    [doc, canvas],
  );

  // 每一幀第一台車來問的時候算一次所有車的位置
  const source = useMemo(() => {
    const cache: { t: number; poses: VehiclePose[] } = { t: Number.NaN, poses: [] };
    return (id: string, out: VehicleFrame) => {
      if (!trace) return false;
      const t = store.get(playTimeAtom);
      if (t !== cache.t) {
        cache.poses = posesAt(trace, t);
        cache.t = t;
      }
      const k = Number(id);
      const v = cache.poses[k];
      if (!v) return false;
      out.x = v.x;
      out.y = v.y;
      // 模擬的車頭是行進方向, 進站取放貨時車頭對著站點; 叉車要牙叉對著站點才拿得到貨,
      // 所以叉車的模型轉過來, 牙叉朝前 (首頁即時資料是車身朝前、叉臂往後伸, 同 2D 地圖)。
      // MiR、SW15 沒有牙叉, 車頭照行進方向
      const kind = modelsRef.current[k]?.kind;
      out.yaw = v.heading + (kind === "mir250" || kind === "m68" ? 0 : Math.PI);
      out.ring = colors[bucketOf(v.state)];
      out.dim = false;

      const fork = forkAt(work[k], t, v.state);
      out.lift = fork.lift;
      out.loaded = fork.loaded;
      return true;
    };
  }, [trace, store, colors, work]);

  const followTarget = useMemo(() => {
    if (follow === null) return null;
    const frame = emptyFrame();
    return () => (source(follow, frame) ? frame : null);
  }, [follow, source]);

  return (
    <>
      <Scene3D
        bounds={bounds}
        background={canvas.paper}
        gridColor={theme.colors.border}
        dark={canvas.dark}
        follow={followTarget}
        apiRef={apiRef}
        onPointerMissed={stopFollow}
      >
        {doc.background && backgroundUrl && (
          <MapGround
            url={backgroundUrl}
            widthPx={doc.background.widthPx}
            heightPx={doc.background.heightPx}
            originX={doc.background.originX}
            originY={doc.background.originY}
            metersPerPx={doc.background.metersPerPx}
            recolor={null}
            opacity={doc.background.opacity}
          />
        )}
        {doc.cad && cadGeom && cadHidden && <CadLines3D cad={doc.cad} geometry={cadGeom} hidden={cadHidden} color={canvas.cad} />}
        <PlayTimeFrames store={store} />
        <Roads3D segments={paths} color={canvas.road} opacity={heat ? 0.45 : 1} />
        {heat && <Roads3D segments={heatPaths} color={canvas.road} width={6} />}
        {highlightPaths.length > 0 && <Roads3D segments={highlightPaths} color={canvas.accent} width={14} opacity={0.45} />}
        {!heat && <Dots3D dots={points} size={6} />}
        {/* 框起來的站點畫在站點底下, 看起來是一圈 */}
        {highlightNodes.length > 0 && <Dots3D dots={highlightNodes} size={26} />}
        <Dots3D dots={stations} size={12} />
        {heat && <Dots3D dots={heatNodes} size={16} />}
        {deadlock?.points.map((p, i) => (
          <group key={i} position={[p.x, 0, -p.y]}>
            <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.9, 1.15, 40]} />
              <meshBasicMaterial color={DEADLOCK_COLOR} transparent opacity={0.9} depthWrite={false} />
            </mesh>
            <Html position={[0, 1.6, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[30, 0]}>
              <div style={{ color: DEADLOCK_COLOR, fontWeight: 700, fontSize: 18, textShadow: "0 0 3px #fff" }}>!</div>
            </Html>
          </group>
        ))}
        {trace?.vehicles.map((v, k) => (
          <ModelBoundary
            key={k}
            resetKeys={[models[k]?.url]}
            fallback={
              <Vehicle3D
                id={String(k)}
                model={{ ...FORKLIFT_MODEL, fitLength: v.length > 0 ? v.length : undefined }}
                anchor="center"
                source={source}
                selected={follow === String(k)}
                onSelect={setFollow}
                label={<VehicleLabel name={v.name} selected={follow === String(k)} />}
              />
            }
          >
            <Vehicle3D
              id={String(k)}
              model={models[k] ?? FORKLIFT_MODEL}
              anchor="center"
              source={source}
              selected={follow === String(k)}
              onSelect={setFollow}
              label={<VehicleLabel name={v.name} selected={follow === String(k)} />}
            />
          </ModelBoundary>
        ))}
      </Scene3D>
      {follow !== null && trace?.vehicles[Number(follow)] && (
        <FollowChip name={trace.vehicles[Number(follow)].name} onStop={stopFollow} top="54px" />
      )}
    </>
  );
};

export default Replay3D;
