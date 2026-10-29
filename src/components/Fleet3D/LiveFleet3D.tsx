import { FC, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { Html } from "@react-three/drei";
import useMap from "@/api/useMap";
import useName from "@/api/useAmrName";
import useAMRsample from "@/api/useAMRsample";
import { AmrFilterCarCard, centerMap, Scale, showZoneForbidden } from "@/utils/gloable";
import {
  isShowAnnotation,
  isShowLocation,
  isShowLocationTooltip,
  isShowPointCloud,
  isShowRoad,
  isShowRoadTooltip,
  showAllZonesSwitch,
} from "@/utils/siderGloble";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { buildMapImageMatrix, getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";
import { isDarkColor } from "@/theme/mapImage";
import { isPointAreaType } from "@/pages/Setting/mapComponents/components/AllLocation/pointAreaTypes";
import { createLiveStore, LiveStore } from "@/components/CanvasMap/liveStore";
import { amrColor, amrShownAt, amrTip } from "@/components/CanvasMap/draw";
import { CanvasMapApi } from "@/components/CanvasMap/CanvasMap";
import { hiddenZoneIdsAtom, linkedZoneHighlightAtom } from "@/components/CanvasMap/MapOverlay";
import { FOCUS_MARKER_MS, FOCUS_REQUEST_TTL_MS, focusLocationRequest } from "@/components/CanvasMap/focusLocation";
import { HoverLabel } from "@/pages/Setting/mapComponents/components/HoverLabel";
import { OpenChargeStationModal } from "@/pages/Main/global/jotai";
import ChargeStationPanel from "@/pages/Main/components/PadViwe/components/PadMapContent/AllChargeStation/StatusPanel";
import Scene3D, { Bounds, CameraApi, ModelBoundary } from "./Scene3D";
import MapGround from "./MapGround";
import { BBoxes3D, Dot, Dots3D, FocusMarker3D, PointClouds3D, Roads3D, Segment } from "./MapLayers3D";
import MapOverlay3D from "./MapOverlay3D";
import ZoneLabels3D from "./ZoneLabels3D";
import { AnchorLayer, AnchorProjector, ScreenAnchors } from "./ScreenAnchors";
import Devices3D from "./Devices3D";
import { devicePlacements } from "./devicePlacement";
import Vehicle3D from "./Vehicle3D";
import VehicleLabel from "./VehicleLabel";
import VehicleInfoCard from "./VehicleInfoCard";
import { LiveTracks } from "./liveTracks";
import { FORKLIFT_MODEL, robotTypeFor, vehicleModelFor } from "./vehicleModels";
import { Patrol } from "./patrol";
import { patrolAtom, vehicleLabelsAtom } from "./viewMode";
import CorrectionGhost3D, { CorrectionPanel3D } from "./CorrectionGhost3D";
import SimCarMarkers3D from "./SimCarMarkers3D";
import Trail3D from "./Trail3D";

/**
 * 首頁地圖的 3D 版: 現場地圖鋪在地上, 車用 3D 模型照 amr-profile 的位置跑, 取放貨時牙叉會升降;
 * 貨架、堆疊、輸送帶、電梯、充電站畫成 3D 設備 (Devices3D)。
 * 實車、模擬車 (後端的 MockAMR) 都一樣, 跟 2D 地圖看同一批資料、同一套規則 (哪些車要畫、哪條路被誰佔用)。
 * 2D 地圖上有的也都有: 區域 (名稱、眼睛、資訊卡)、地圖標註、車框、點位 / 路線提示、「在地圖上定位」,
 * 捲門 / 包膜線 / 門前等待點、「任務派發」選點位、充電站控制 (Devices3D)、定位校正 (CorrectionGhost3D)、
 * 模擬車的起始位置 (SimCarMarkers3D)。
 *
 * 點車: 鏡頭跟著那台車 (左鍵改成繞著車轉), 上面的資訊卡列出狀態和告警的處理方式; 點空白處或按 Esc 取消。
 * 巡視模式 (patrol.ts): 有車出現告警時鏡頭自動飛過去。
 */

/** 點位離游標多近 (公尺) 算點到 */
const POINT_HIT_RADIUS = 0.6;
/** 定位點位、巡視飛到車上時, 鏡頭離那裡多遠 (公尺; 本來就比較近就不拉遠) */
const FOCUS_DISTANCE = 14;
const PATROL_DISTANCE = 18;
/** 巡視看區域時: 區域的長邊乘上這個倍數 (鏡頭斜著看要多退一點), 最近這麼近 */
const AREA_FIT = 1.7;
const AREA_MIN_DISTANCE = 12;
/** 標籤上最多列幾個告警 */
const LABEL_ALERTS = 2;

type Label = { tip: string; dest: string; paused: boolean; warning: boolean; alerts: string[] };

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
  const showZones = useAtomValue(showAllZonesSwitch);
  const showAnnotation = useAtomValue(isShowAnnotation);
  const showLocationTooltip = useAtomValue(isShowLocationTooltip);
  const showRoadTooltip = useAtomValue(isShowRoadTooltip);
  const hiddenZoneIds = useAtomValue(hiddenZoneIdsAtom);
  const linkedZones = useAtomValue(linkedZoneHighlightAtom);
  const patrolOn = useAtomValue(patrolAtom);
  const showVehicleLabels = useAtomValue(vehicleLabelsAtom);
  const chargerPanel = useAtomValue(OpenChargeStationModal);
  const [focusReq, setFocusReq] = useAtom(focusLocationRequest);
  const { t } = useTranslation();

  const cameraRef = useRef<CameraApi | null>(null);
  const storeRef = useRef<LiveStore | null>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, Label>>({});
  const [claimed, setClaimed] = useState<Map<string, string>>(new Map());
  const [hoverPoint, setHoverPoint] = useState<Dot | null>(null);
  const [hoverRoad, setHoverRoad] = useState<number | null>(null);
  const [marker, setMarker] = useState<{ x: number; y: number; key: number } | null>(null);
  const anchors = useMemo(() => new ScreenAnchors(), []);

  const tracks = useMemo(() => new LiveTracks(), []);
  tracks.filter = { currentMapId, filterIds, forbiddenIds, color: amrColor, simulated: !!names?.isSim };

  // 即時資料: 跟 2D 地圖一樣直接訂閱 socket, 位置不經過 React;
  // 只有標籤文字、被佔用的路線換了才 setState
  useEffect(() => {
    const store = createLiveStore();
    storeRef.current = store;
    let labelKey = "";
    const off = store.subscribe(() => {
      const { state } = store;
      tracks.ingest(state, performance.now());
      // 畫布只在有東西變的時候畫 (Scene3D 的 frameloop="demand")
      cameraRef.current?.invalidate();
      const next: Record<string, Label> = {};
      state.amrs.forEach((a, id) => {
        const { tipText, dest } = amrTip(state, id);
        next[id] = {
          tip: tipText,
          dest,
          paused: a.isPause,
          warning: state.warnings.has(id),
          alerts: (state.warningInfos.get(id) ?? []).slice(0, LABEL_ALERTS).map((m) => m.info),
        };
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
  const darkCanvas = useMemo(() => isDarkColor(canvas.paper), [canvas]);

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

  // 巡視: 有新的告警就飛過去跟著那台車, 好幾台輪流, 都沒了回全景; 使用者自己點車 / 取消跟車後先停一陣子
  const patrol = useMemo(() => new Patrol(), []);
  const userFollow = useCallback(
    (id: string) => {
      patrol.pause(performance.now());
      setFollow(id);
    },
    [patrol],
  );
  const stopFollow = useCallback(() => {
    patrol.pause(performance.now());
    setFollow(null);
  }, [patrol]);
  const followTarget = useMemo(() => (follow ? () => tracks.positionOf(follow) : null), [follow, tracks]);

  // 巡視沒有告警時輪流看的區域 (地圖上的區域, 藏起來的不看): 中心、鏡頭要退多遠才框得住
  const tourAreas = useMemo(
    () =>
      (map?.zones ?? [])
        .filter((z) => !hiddenZoneIds.has(z.id))
        .map((z) => {
          const w = Math.abs(z.endPoint.endX - z.startPoint.startX);
          const h = Math.abs(z.endPoint.endY - z.startPoint.startY);
          return {
            x: (z.startPoint.startX + z.endPoint.endX) / 2,
            y: (z.startPoint.startY + z.endPoint.endY) / 2,
            distance: Math.max(AREA_MIN_DISTANCE, Math.max(w, h) * AREA_FIT),
          };
        }),
    [map, hiddenZoneIds],
  );

  useEffect(() => {
    if (!patrolOn) return;
    patrol.reset();
    const tick = () => {
      const state = storeRef.current?.state;
      if (!state) return;
      const warned = amrIds.filter((id) => state.warnings.has(id) && amrShownAt(state, id, currentMapId, !!names?.isSim));
      const step = patrol.step(warned, performance.now(), tourAreas.length);
      if (step?.kind === "follow") {
        setFollow(step.id);
        const p = tracks.positionOf(step.id);
        if (p) cameraRef.current?.flyTo(p.x, p.y, PATROL_DISTANCE);
      } else if (step?.kind === "overview") {
        setFollow(null);
        cameraRef.current?.reset();
      } else if (step?.kind === "area") {
        const area = tourAreas[step.index];
        setFollow(null);
        if (area) cameraRef.current?.flyTo(area.x, area.y, area.distance, true);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [patrolOn, patrol, amrIds, currentMapId, tracks, names, tourAreas]);

  // 在地圖上定位 (貨物紀錄等頁面發的請求, 同 2D): 鏡頭飛過去, 箭頭指幾秒
  useEffect(() => {
    if (!focusReq) return;
    if (Date.now() - focusReq.at > FOCUS_REQUEST_TTL_MS) {
      setFocusReq(null);
      return;
    }
    if (!map) return;
    let tries = 0;
    let timer = 0;
    const run = () => {
      const camera = cameraRef.current;
      // 剛切到 3D 時畫布還沒準備好, 等一下再做
      if (!camera) {
        if (++tries < 20) timer = window.setTimeout(run, 100);
        else setFocusReq(null);
        return;
      }
      setFocusReq(null);
      const loc = map.locations.find((l) => String(l.locationId) === focusReq.locationId);
      if (!loc) {
        void message.warning(t("cargo_history.locate_not_found", { id: focusReq.locationId }));
        return;
      }
      patrol.pause(performance.now());
      setFollow(null);
      camera.flyTo(loc.x, loc.y, FOCUS_DISTANCE);
      setMarker({ x: loc.x, y: loc.y, key: focusReq.at });
    };
    // 跟 2D 一樣先等一下: 首頁剛載入時鏡頭會先對準整張地圖
    timer = window.setTimeout(run, 400);
    return () => window.clearTimeout(timer);
  }, [focusReq, map, setFocusReq, t, patrol]);
  useEffect(() => {
    if (!marker) return;
    const timer = window.setTimeout(() => setMarker(null), FOCUS_MARKER_MS);
    return () => window.clearTimeout(timer);
  }, [marker]);

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
        {map && (
          <MapOverlay3D
            map={map}
            showZones={showZones}
            hiddenZoneIds={hiddenZoneIds}
            showAnnotation={showAnnotation}
            linked={linkedZones}
            colors={colors}
            darkCanvas={darkCanvas}
          />
        )}
        {showRoad && <Roads3D segments={roads} color={colors.mapRoad} onHover={showRoadTooltip ? setHoverRoad : undefined} />}
        {showLocation && <Dots3D dots={points} onClick={onPointClick} onHover={showLocationTooltip ? setHoverPoint : undefined} />}
        {showPointCloud && <PointClouds3D state={liveState} ids={amrIds} color={amrColor} currentMapId={currentMapId} />}
        <BBoxes3D state={liveState} ids={amrIds} color={amrColor} currentMapId={currentMapId} simulated={!!names?.isSim} />
        {/* 點位 / 路線提示 (同 2D 的「地點提示」「路徑提示」) */}
        {hoverPoint && showLocation && showLocationTooltip && (
          <Html position={[hoverPoint.x, 0.4, -hoverPoint.y]} center style={{ pointerEvents: "none" }} zIndexRange={[30, 0]}>
            <HoverLabel $accent="blue">{hoverPoint.id}</HoverLabel>
          </Html>
        )}
        {hoverRoad !== null && showRoad && showRoadTooltip && map?.roads?.[hoverRoad] && (
          <Html
            position={[(map.roads[hoverRoad].x1 + map.roads[hoverRoad].x2) / 2, 0.4, -(map.roads[hoverRoad].y1 + map.roads[hoverRoad].y2) / 2]}
            center
            style={{ pointerEvents: "none" }}
            zIndexRange={[30, 0]}
          >
            <HoverLabel $accent="red">{map.roads[hoverRoad].roadId}</HoverLabel>
          </Html>
        )}
        {marker && <FocusMarker3D key={marker.key} x={marker.x} y={marker.y} />}
        <AnchorProjector anchors={anchors} />
        {/* 設備跟 2D 一樣跟著「地點」開關 */}
        {showLocation && (
          <ModelBoundary>
            <Devices3D placements={placements} />
          </ModelBoundary>
        )}
        <CorrectionGhost3D />
        {/* 跟著的車後面拖最近 30 秒的軌跡 (定位跳動的那段是紅的) */}
        {follow && <Trail3D id={follow} tracks={tracks} color={amrColor(follow)} />}
        {/* 每台車各自等模型: 第一次載 MiR / SW15 / 上傳的模型時, 已經在畫的叉車不會跟著消失 */}
        {amrIds.map((id) => {
          const label = labels[id];
          const lines = label ? [label.tip, label.dest && `→ ${label.dest}`].filter((l): l is string => !!l) : [];
          const common = {
            id,
            source: tracks.read,
            selected: follow === id,
            onSelect: userFollow,
            labelOnHover: !showVehicleLabels,
            label: (
              <VehicleLabel
                name={`${forbiddenIds.has(id) ? "🚫 " : ""}${id}`}
                color={amrColor(id)}
                lines={lines}
                paused={label?.paused}
                warning={label?.warning}
                alerts={label?.alerts}
                selected={follow === id}
              />
            ),
          };
          // 模型照車型設定 (沒設定照車名); 上傳的模型載不到就畫叉車
          const model = vehicleModelFor(id, robotTypes);
          return (
            <ModelBoundary key={id} resetKeys={[model.url]} fallback={<Vehicle3D model={FORKLIFT_MODEL} {...common} />}>
              <Vehicle3D model={model} {...common} />
            </ModelBoundary>
          );
        })}
      </Scene3D>
      {/* 區域名稱要用 react-query / antd, 不能放 drei Html (另一個 React root), 放在畫布外面跟著投影 */}
      <AnchorLayer>
        {map && showZones && <ZoneLabels3D map={map} anchors={anchors} />}
        <SimCarMarkers3D anchors={anchors} />
      </AnchorLayer>
      {/* 跟 2D 地圖同一套: 定位校正的面板、點充電站打開的控制面板 */}
      <CorrectionPanel3D />
      {chargerPanel ? <ChargeStationPanel locId={chargerPanel} /> : null}
      {/* 首頁地圖上方中間是 2D / 3D 切換, 讓開它 */}
      {follow && (
        <VehicleInfoCard
          key={follow}
          id={follow}
          color={amrColor(follow)}
          typeName={robotTypeFor(follow, robotTypes)?.name}
          store={() => storeRef.current}
          onClose={stopFollow}
          top="calc(var(--space-sm) + 44px)"
        />
      )}
    </>
  );
};

export default LiveFleet3D;
