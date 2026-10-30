import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Select, Slider } from "antd";
import { CaretRightOutlined, PauseOutlined } from "@ant-design/icons";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import styled from "styled-components";
import useMap from "@/api/useMap";
import useName from "@/api/useAmrName";
import useAMRsample from "@/api/useAMRsample";
import type { IncidentReplay } from "@/api/useEStopHistory";
import { buildMapImageMatrix, getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";
import { amrColor, sw15ToMap, usesSW15Frame } from "@/components/CanvasMap/draw";
import { isPointAreaType } from "@/pages/Setting/mapComponents/components/AllLocation/pointAreaTypes";
import Scene3D, { Bounds, CameraApi, ModelBoundary } from "./Scene3D";
import MapGround from "./MapGround";
import { Dot, Dots3D, Roads3D, Segment } from "./MapLayers3D";
import Vehicle3D from "./Vehicle3D";
import VehicleLabel from "./VehicleLabel";
import { VehicleFrame } from "./frame";
import { CARRY_LIFT } from "./forkliftRig";
import { ALERT_BODY } from "./alerts";
import { FORKLIFT_MODEL, vehicleModelFor } from "./vehicleModels";
import { incidentLoadedAt, incidentPoseAt } from "./incidentTimeline";

/**
 * 急停的現場回放 (3D): 急停前 60 秒到之後 20 秒, 各台車在哪、怎麼走 (後端急停時存的, 見 incidentReplay)。
 * 地圖 (底圖、路線、點位) 用現在的; 被暫停的那台急停之後整台發紅光。時間軸可以拖、可以播, 0 是急停那一刻。
 * 播的時候時間放在 ref 裡, 車每一幀自己讀, 不用每一幀重畫 React; 時間軸一秒更新十次。
 */

const STOPPED_RING = "#ff4d4f";
/** 一開始從急停前幾秒開始播 */
const START_MS = -15_000;
const SPEEDS = [0.5, 1, 2, 4];
/** 鏡頭一開始框住被暫停的那台急停時的位置, 四周留多少 (公尺) */
const FOCUS_MARGIN = 8;

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  > .scene {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
  }
  > .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px 0;
    font-size: 12px;
    color: var(--c-text-secondary);

    .ant-slider {
      flex: 1 1 auto;
      margin: 6px 8px 14px;
    }
    .time {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      color: var(--c-text);
    }
  }
`;

type Vehicle = IncidentReplay["vehicles"][number];

const IncidentReplay3D: FC<{ replay: IncidentReplay }> = ({ replay }) => {
  const { t } = useTranslation();
  const { data: map } = useMap();
  const { data: names } = useName();
  const { data: robotTypes } = useAMRsample();
  const theme = useAtomValue(themeAtom);
  const mapImageMode = useAtomValue(mapImageModeAtom);
  const colors = useMemo(() => resolveColors(theme, mapImageMode), [theme, mapImageMode]);
  const recolor = useMemo(() => buildMapImageMatrix(getMapCanvas(theme, mapImageMode)), [theme, mapImageMode]);
  const cameraRef = useRef<CameraApi | null>(null);

  const start = Math.max(-replay.beforeMs, START_MS);
  const timeRef = useRef(start);
  const [time, setTime] = useState(start);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  // 實車才要轉 SW15 的座標; 後端查不到時看現在的車輛清單, 再查不到看名稱 (模擬車是 # 開頭)
  const simulated = useCallback(
    (v: Vehicle) => (v.isReal ?? names?.amrs.find((a) => a.amrId === v.amrId)?.isReal ?? !v.amrId.startsWith("#")) === false,
    [names],
  );
  const vehicles = useMemo(() => new Map(replay.vehicles.map((v) => [v.amrId, v])), [replay]);

  const source = useCallback(
    (id: string, out: VehicleFrame) => {
      const v = vehicles.get(id);
      const now = timeRef.current;
      const p = v && incidentPoseAt(v, now);
      if (!v || !p) return false;
      const sw15 = usesSW15Frame(id, simulated(v));
      const at = sw15 ? sw15ToMap(p.x, p.y) : p;
      out.x = at.x;
      out.y = at.y;
      out.yaw = ((p.yaw + (sw15 ? 180 : 0)) * Math.PI) / 180;
      out.loaded = incidentLoadedAt(v, now);
      out.lift = out.loaded ? CARRY_LIFT : 0;
      const stopped = id === replay.amrId && now >= 0;
      out.ring = stopped ? STOPPED_RING : amrColor(id);
      out.dim = false;
      out.alert = stopped ? ALERT_BODY : 0;
      return true;
    },
    [vehicles, simulated, replay.amrId],
  );

  // 播放: 照實際經過的時間 x 速度往前走; 時間軸一秒更新十次
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let shown = last;
    const tick = (now: number) => {
      timeRef.current = Math.min(replay.afterMs, timeRef.current + (now - last) * speed);
      last = now;
      cameraRef.current?.invalidate();
      if (timeRef.current >= replay.afterMs) {
        setTime(timeRef.current);
        setPlaying(false);
        return;
      }
      if (now - shown > 100) {
        shown = now;
        setTime(timeRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, replay.afterMs]);

  const seek = (ms: number) => {
    timeRef.current = ms;
    setTime(ms);
    cameraRef.current?.invalidate();
  };

  // 鏡頭一開始框住被暫停的那台急停時的位置 (四周留 FOCUS_MARGIN); 沒有它的資料才看整張地圖
  const bounds = useMemo<Bounds | null>(() => {
    const v = vehicles.get(replay.amrId);
    const p = v && (incidentPoseAt(v, 0) ?? incidentPoseAt(v, v.samples[v.samples.length - 1]?.[0] ?? 0));
    if (v && p) {
      const at = usesSW15Frame(v.amrId, simulated(v)) ? sw15ToMap(p.x, p.y) : p;
      return { minX: at.x - FOCUS_MARGIN, minY: at.y - FOCUS_MARGIN, maxX: at.x + FOCUS_MARGIN, maxY: at.y + FOCUS_MARGIN };
    }
    return map
      ? {
          minX: map.mapOriginX,
          minY: map.mapOriginY,
          maxX: map.mapOriginX + map.mapWidth * map.mapResolution,
          maxY: map.mapOriginY + map.mapHeight * map.mapResolution,
        }
      : null;
  }, [vehicles, replay.amrId, simulated, map]);
  const roads = useMemo<Segment[]>(
    () => (map?.roads ?? []).map((r) => ({ x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, color: r.priority === 1 ? colors.mapRoadPriority : colors.mapRoad })),
    [map, colors],
  );
  const points = useMemo<Dot[]>(
    () =>
      (map?.locations ?? [])
        .filter((l) => isPointAreaType(l.areaType))
        .map((l) => ({ id: l.locationId.toString(), x: l.x, y: l.y, color: l.canRotate ? colors.mapPointRotate : colors.mapPoint })),
    [map, colors],
  );

  const clock = dayjs(replay.time).add(time, "millisecond").format("HH:mm:ss");
  return (
    <Root data-testid="incident-replay">
      <div className="scene">
        <Scene3D
          bounds={bounds}
          background={theme.colors.bgMuted}
          gridColor={theme.colors.border}
          dark={theme.mode === "dark"}
          follow={null}
          apiRef={cameraRef}
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
          <Roads3D segments={roads} color={colors.mapRoad} />
          <Dots3D dots={points} />
          {replay.vehicles.map((v) => {
            const model = vehicleModelFor(v.amrId, robotTypes);
            const common = {
              id: v.amrId,
              source,
              labelOnHover: false,
              label: (
                <VehicleLabel
                  name={v.amrId}
                  color={v.amrId === replay.amrId ? STOPPED_RING : amrColor(v.amrId)}
                  lines={v.amrId === replay.amrId ? [t("fleet3d.incident.stopped_car")] : []}
                />
              ),
            };
            return (
              <ModelBoundary key={v.amrId} resetKeys={[model.url]} fallback={<Vehicle3D model={FORKLIFT_MODEL} {...common} />}>
                <Vehicle3D model={model} {...common} />
              </ModelBoundary>
            );
          })}
        </Scene3D>
      </div>
      <div className="bar">
        <Button
          size="small"
          type="primary"
          icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={() => {
            if (!playing && timeRef.current >= replay.afterMs) seek(-replay.beforeMs);
            setPlaying(!playing);
          }}
          data-testid="incident-play"
          aria-label={playing ? t("sim_v2.result.pause") : t("sim_v2.result.play")}
        />
        <Select size="small" value={speed} style={{ width: 76 }} options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} onChange={setSpeed} />
        <Slider
          min={-replay.beforeMs / 1000}
          max={replay.afterMs / 1000}
          step={0.1}
          value={time / 1000}
          marks={{ 0: { label: t("fleet3d.incident.stop_mark"), style: { color: "var(--c-danger)", fontSize: 11 } } }}
          tooltip={{ formatter: (v) => `${(v ?? 0) > 0 ? "+" : ""}${(v ?? 0).toFixed(1)} s` }}
          onChange={(v) => seek(v * 1000)}
          data-testid="incident-timeline"
        />
        <span className="time" data-testid="incident-time">
          {clock} ({time > 0 ? "+" : ""}
          {(time / 1000).toFixed(1)} s)
        </span>
      </div>
    </Root>
  );
};

export default IncidentReplay3D;
