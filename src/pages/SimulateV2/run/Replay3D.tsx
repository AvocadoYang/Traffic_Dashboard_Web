import { FC, MutableRefObject, useCallback, useMemo, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { themeAtom } from "@/theme";
import Scene3D, { CameraApi } from "@/components/Fleet3D/Scene3D";
import MapGround from "@/components/Fleet3D/MapGround";
import { Dot, Dots3D, Roads3D, Segment } from "@/components/Fleet3D/MapLayers3D";
import Vehicle3D from "@/components/Fleet3D/Vehicle3D";
import { VehicleFrame, emptyFrame } from "@/components/Fleet3D/frame";
import VehicleLabel from "@/components/Fleet3D/VehicleLabel";
import FollowChip from "@/components/Fleet3D/FollowChip";
import { STATION_COLORS, useCanvasColors } from "../editor/hooks";
import { contentBounds } from "../editor/viewMath";
import { useCadGeometry, useHiddenMask } from "../io/dxf/cadLoader";
import { nodeMap } from "../model/ops";
import { projectAtom } from "../state/editorAtoms";
import { RunOutcome, playTimeAtom } from "../state/runAtoms";
import CadLines3D from "./CadLines3D";
import { bucketOf, stateColors } from "./colors";
import { forkAt, forkWorkOf } from "./forkTimeline";
import { VehiclePose, posesAt } from "./replayDraw";

/**
 * 回放的 3D 版: 模擬的佈局鋪在地上, 車照軌跡跑; 取貨、放貨時牙叉升降 (forkTimeline),
 * 載著貨時牙叉上有棧板。地上的色圈是車的狀態 (顏色跟 2D 回放、圖例一樣)。點車: 鏡頭跟著那台車。
 */

const Replay3D: FC<{
  outcome: RunOutcome;
  backgroundUrl: string | null;
  apiRef?: MutableRefObject<CameraApi | null>;
}> = ({ outcome, backgroundUrl, apiRef }) => {
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

  const paths = useMemo<Segment[]>(() => {
    const nodes = nodeMap(doc);
    return doc.paths.flatMap((p) => {
      const a = nodes.get(p.from);
      const b = nodes.get(p.to);
      return a && b ? [{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }] : [];
    });
  }, [doc]);
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
      // 所以模型轉過來, 牙叉朝前 (首頁即時資料是車身朝前、叉臂往後伸, 同 2D 地圖)
      out.yaw = v.heading + Math.PI;
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
        <Roads3D segments={paths} color={canvas.road} />
        <Dots3D dots={points} size={6} />
        <Dots3D dots={stations} size={12} />
        {trace?.vehicles.map((v, k) => (
          <Vehicle3D
            key={k}
            id={String(k)}
            kind="forklift"
            anchor="center"
            fitLength={v.length > 0 ? v.length : undefined}
            source={source}
            selected={follow === String(k)}
            onSelect={setFollow}
            label={<VehicleLabel name={v.name} selected={follow === String(k)} />}
          />
        ))}
      </Scene3D>
      {follow !== null && trace?.vehicles[Number(follow)] && (
        <FollowChip name={trace.vehicles[Number(follow)].name} onStop={stopFollow} top="54px" />
      )}
    </>
  );
};

export default Replay3D;
