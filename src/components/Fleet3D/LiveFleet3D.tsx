import { FC, MutableRefObject, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import useMap from "@/api/useMap";
import useName from "@/api/useAmrName";
import useAMRsample from "@/api/useAMRsample";
import { AmrFilterCarCard, centerMap, Scale, showZoneForbidden } from "@/utils/gloable";
import { isShowLocation, isShowPointCloud, isShowRoad } from "@/utils/siderGloble";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { buildMapImageMatrix, getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";
import { isPointAreaType } from "@/pages/Setting/mapComponents/components/AllLocation/pointAreaTypes";
import { createLiveStore, LiveStore } from "@/components/CanvasMap/liveStore";
import { amrColor, amrTip } from "@/components/CanvasMap/draw";
import { CanvasMapApi, robotTypeValueOf } from "@/components/CanvasMap/CanvasMap";
import Scene3D, { Bounds, CameraApi } from "./Scene3D";
import MapGround from "./MapGround";
import { Dot, Dots3D, PointClouds3D, Roads3D, Segment } from "./MapLayers3D";
import Devices3D from "./Devices3D";
import { devicePlacements } from "./devicePlacement";
import Vehicle3D from "./Vehicle3D";
import VehicleLabel from "./VehicleLabel";
import FollowChip from "./FollowChip";
import { LiveTracks } from "./liveTracks";

/**
 * 首頁地圖的 3D 版: 現場地圖鋪在地上, 車用 3D 模型照 amr-profile 的位置跑, 取放貨時牙叉會升降;
 * 貨架、堆疊、輸送帶、電梯、充電站畫成 3D 設備 (Devices3D)。
 * 實車、模擬車 (後端的 MockAMR) 都一樣, 跟 2D 地圖看同一批資料、同一套規則 (哪些車要畫、哪條路被誰佔用)。
 *
 * 點車: 鏡頭跟著那台車 (左鍵改成繞著車轉); 點空白處或按 Esc 取消。
 */

/** MiR 這類盒子車的長寬 (公尺): 照車型設定, 查不到用這個 */
const MIR_FALLBACK = { length: 0.9, width: 0.6 };
/** 點位離游標多近 (公尺) 算點到 */
const POINT_HIT_RADIUS = 0.6;

type Label = { tip: string; dest: string; paused: boolean; warning: boolean };

type Props = {
  /** 點了點位 (首頁: 打開直接移動) */
  onPointClick?: (locationId: string) => void;
  /** 給外面用的 hit-test (把模擬車拖到地圖上時找最近的點位) */
  apiRef?: MutableRefObject<CanvasMapApi | null>;
};

const LiveFleet3D: FC<Props> = ({ onPointClick, apiRef }) => {
  const { data: map } = useMap();
  const { data: names } = useName();
  const { data: robotTypes } = useAMRsample();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const theme = useAtomValue(themeAtom);
  const mapImageMode = useAtomValue(mapImageModeAtom);
  const showRoad = useAtomValue(isShowRoad);
  const showLocation = useAtomValue(isShowLocation);
  const showPointCloud = useAtomValue(isShowPointCloud);
  const filterIds = useAtomValue(AmrFilterCarCard);
  const forbiddenIds = useAtomValue(showZoneForbidden);
  const cm = useAtomValue(centerMap);
  const scale = useAtomValue(Scale);

  const cameraRef = useRef<CameraApi | null>(null);
  const storeRef = useRef<LiveStore | null>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, Label>>({});
  const [claimed, setClaimed] = useState<Map<string, string>>(new Map());

  const tracks = useMemo(() => new LiveTracks(), []);
  tracks.filter = { currentMapId, filterIds, forbiddenIds, color: amrColor };

  // 即時資料: 跟 2D 地圖一樣直接訂閱 socket, 位置不經過 React;
  // 只有標籤文字、被佔用的路線換了才 setState
  useEffect(() => {
    const store = createLiveStore();
    storeRef.current = store;
    let labelKey = "";
    const off = store.subscribe(() => {
      const { state } = store;
      tracks.ingest(state, performance.now());
      const next: Record<string, Label> = {};
      state.amrs.forEach((a, id) => {
        const { tipText, dest } = amrTip(state, id);
        next[id] = { tip: tipText, dest, paused: a.isPause, warning: state.warnings.has(id) };
      });
      const key = JSON.stringify(next);
      if (key !== labelKey) {
        labelKey = key;
        setLabels(next);
      }
      setClaimed((prev) => (prev === state.claimedRoads ? prev : state.claimedRoads));
    });
    return () => {
      off();
      store.dispose();
      storeRef.current = null;
    };
  }, [tracks]);

  // 跟 2D 地圖一樣: 模擬模式只畫模擬車, 否則只畫實車
  const amrIds = useMemo(
    () => (names ? names.amrs.filter((v) => (names.isSim ? v.isReal === false : v.isReal)).map((v) => v.amrId) : []),
    [names],
  );

  const colors = useMemo(() => resolveColors(theme, mapImageMode), [theme, mapImageMode]);
  const canvas = useMemo(() => getMapCanvas(theme, mapImageMode), [theme, mapImageMode]);
  const recolor = useMemo(() => buildMapImageMatrix(canvas), [canvas]);

  const bounds = useMemo<Bounds | null>(
    () =>
      map
        ? {
            minX: map.mapOriginX,
            minY: map.mapOriginY,
            maxX: map.mapOriginX + map.mapWidth * map.mapResolution,
            maxY: map.mapOriginY + map.mapHeight * map.mapResolution,
          }
        : null,
    [map],
  );

  const roads = useMemo<Segment[]>(
    () =>
      (map?.roads ?? []).map((r) => {
        const by = claimed.get(r.roadId);
        return {
          x1: r.x1,
          y1: r.y1,
          x2: r.x2,
          y2: r.y2,
          color: by ? amrColor(by) : r.priority === 1 ? colors.mapRoadPriority : colors.mapRoad,
        };
      }),
    [map, claimed, colors],
  );

  const placements = useMemo(() => (map ? devicePlacements(map.locations, map.roads ?? []) : []), [map]);

  const points = useMemo<Dot[]>(
    () =>
      (map?.locations ?? [])
        .filter((l) => isPointAreaType(l.areaType))
        .map((l) => ({ id: l.locationId.toString(), x: l.x, y: l.y, color: l.canRotate ? colors.mapPointRotate : colors.mapPoint })),
    [map, colors],
  );

  // 工具列: 回原位、放大縮小 (同一組 atom, 2D 地圖也是聽這個)
  const firstCm = useRef(cm);
  useEffect(() => {
    if (cm !== firstCm.current) cameraRef.current?.reset();
  }, [cm]);
  const lastScale = useRef(scale);
  useEffect(() => {
    const prev = lastScale.current;
    lastScale.current = scale;
    // 工具列一次加減 0.035; 換地圖時首頁會直接設成地圖的預設縮放, 那種跳動不理
    if (Math.abs(scale - prev) > 0 && Math.abs(scale - prev) < 0.1) cameraRef.current?.zoom(scale > prev ? 1.25 : 0.8);
  }, [scale]);

  const stopFollow = useCallback(() => setFollow(null), []);
  const followTarget = useMemo(() => (follow ? () => tracks.positionOf(follow) : null), [follow, tracks]);

  // 給外面的 hit-test: 只有找點位, 2D 的視角那些在 3D 沒有意義
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  useEffect(() => {
    if (!apiRef) return;
    const nearest = (clientX: number, clientY: number, maxDist: number) => {
      const g = cameraRef.current?.groundAt(clientX, clientY);
      const b = boundsRef.current;
      if (!g || !b || g.x < b.minX || g.x > b.maxX || g.y < b.minY || g.y > b.maxY) return null;
      let best: string | null = null;
      let bestD = maxDist;
      for (const p of pointsRef.current) {
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        if (d < bestD) {
          bestD = d;
          best = p.id;
        }
      }
      return best;
    };
    apiRef.current = {
      pointAt: (x, y) => nearest(x, y, POINT_HIT_RADIUS),
      nearestPointAt: (x, y) => nearest(x, y, Infinity),
      locationClientPos: (locationId) => {
        const loc = map?.locations.find((l) => l.locationId.toString() === locationId);
        return loc ? (cameraRef.current?.toClient(loc.x, loc.y) ?? null) : null;
      },
      currentView: () => null,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, map]);

  const mirSize = useCallback(
    (amrId: string) => {
      const type = robotTypes?.find((r) => r.value === robotTypeValueOf(amrId));
      return {
        length: type && type.length > 0 ? type.length : MIR_FALLBACK.length,
        width: type && type.width > 0 ? type.width : MIR_FALLBACK.width,
      };
    },
    [robotTypes],
  );

  const liveState = useCallback(() => storeRef.current?.state ?? null, []);

  return (
    <>
      <Scene3D
        bounds={bounds}
        background={theme.colors.bgMuted}
        gridColor={theme.colors.border}
        dark={theme.mode === "dark"}
        follow={followTarget}
        apiRef={cameraRef}
        onPointerMissed={stopFollow}
      >
        {map?.imageUrl && (
          <MapGround
            url={map.imageUrl}
            widthPx={map.mapWidth}
            heightPx={map.mapHeight}
            originX={map.mapOriginX}
            originY={map.mapOriginY}
            metersPerPx={map.mapResolution}
            recolor={recolor}
          />
        )}
        {showRoad && <Roads3D segments={roads} color={colors.mapRoad} />}
        {showLocation && <Dots3D dots={points} onClick={onPointClick} />}
        {showPointCloud && <PointClouds3D state={liveState} ids={amrIds} color={amrColor} currentMapId={currentMapId} />}
        {/* 設備跟 2D 一樣跟著「地點」開關 */}
        {showLocation && (
          <Suspense fallback={null}>
            <Devices3D placements={placements} />
          </Suspense>
        )}
        <Suspense fallback={null}>
          {amrIds.map((id) => {
            const label = labels[id];
            const lines = label ? [label.tip, label.dest && `→ ${label.dest}`].filter((l): l is string => !!l) : [];
            const common = {
              id,
              source: tracks.read,
              selected: follow === id,
              onSelect: setFollow,
              label: (
                <VehicleLabel
                  name={`${forbiddenIds.has(id) ? "🚫 " : ""}${id}`}
                  color={amrColor(id)}
                  lines={lines}
                  paused={label?.paused}
                  warning={label?.warning}
                  selected={follow === id}
                />
              ),
            };
            return id.includes("mi") ? (
              <Vehicle3D key={id} kind="box" {...mirSize(id)} {...common} />
            ) : (
              <Vehicle3D key={id} kind="forklift" {...common} />
            );
          })}
        </Suspense>
      </Scene3D>
      {/* 首頁地圖上方中間是 2D / 3D 切換, 讓開它 */}
      {follow && <FollowChip name={follow} onStop={stopFollow} top="calc(var(--space-sm) + 44px)" />}
    </>
  );
};

export default LiveFleet3D;
