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
import type { TrackHeatData, TrackReplayData, TrackVehicle } from "@/api/useTrackArchive";
import { buildMapImageMatrix, getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";
import { amrColor, sw15ToMap, usesSW15Frame } from "@/components/CanvasMap/draw";
import { isPointAreaType } from "@/pages/Setting/mapComponents/components/AllLocation/pointAreaTypes";
import Scene3D, { Bounds, CameraApi, ModelBoundary } from "./Scene3D";
import MapGround from "./MapGround";
import { Dot, Dots3D, Roads3D, Segment } from "./MapLayers3D";
import Vehicle3D from "./Vehicle3D";
import VehicleLabel from "./VehicleLabel";
import HeatLayer3D from "./HeatLayer3D";
import { HeatMetric } from "./heatColors";
import { VehicleFrame } from "./frame";
import { CARRY_LIFT } from "./forkliftRig";
import { FORKLIFT_MODEL, vehicleModelFor } from "./vehicleModels";
import { incidentLoadedAt, incidentPoseAt } from "./incidentTimeline";

/**
 * 車隊回放 / 熱度圖 (3D): 後端 TrackArchive 存的各台車位置。
 * 回放: 時間軸從查詢範圍的開頭到結尾, 播放速度可以很快 (一小時的紀錄用 60 倍看一分鐘);
 * 熱度圖: 把範圍內車待過、開過的地方畫成色塊。地圖 (底圖、路線、點位) 用現在的。
 * 播的時候時間放在 ref 裡, 車每一幀自己讀, 不用每一幀重畫 React; 時間軸一秒更新十次。
 */

const SPEEDS = [1, 5, 15, 60, 300];
/** 最後一筆位置之後多久沒資料就當作車不在了 (ms): 後端每分鐘至少補一筆, 兩分鐘沒有就是離線 */
const GONE_MS = 130_000;

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

type Props = {
  mode: "replay" | "heat";
  replay: TrackReplayData | null;
  heat: TrackHeatData | null;
  metric: HeatMetric;
};

const TrackReplay3D: FC<Props> = ({ mode, replay, heat, metric }) => {
  const { t } = useTranslation();
  const { data: map } = useMap();
  const { data: names } = useName();
  const { data: robotTypes } = useAMRsample();
  const theme = useAtomValue(themeAtom);
  const mapImageMode = useAtomValue(mapImageModeAtom);
  const colors = useMemo(() => resolveColors(theme, mapImageMode), [theme, mapImageMode]);
  const recolor = useMemo(() => buildMapImageMatrix(getMapCanvas(theme, mapImageMode)), [theme, mapImageMode]);
  const cameraRef = useRef<CameraApi | null>(null);

  const duration = replay ? Math.max(0, replay.to - replay.from) : 0;
  const timeRef = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(15);

  // 換了查詢範圍: 回到開頭
  useEffect(() => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(false);
  }, [replay?.from, replay?.to]);

  // 時間換成相對查詢開頭 (數字小, 插值不會失準)
  const vehicles = useMemo(() => {
    const from = replay?.from ?? 0;
    return new Map(
      (replay?.vehicles ?? []).map((v): [string, TrackVehicle] => [
        v.amrId,
        {
          ...v,
          samples: v.samples.map(([at, x, y, yaw]) => [at - from, x, y, yaw]),
          cargo: v.cargo.map(([at, on]) => [at - from, on]),
        },
      ]),
    );
  }, [replay]);

  // 實車才要轉 SW15 的座標; 後端查不到時看現在的車輛清單, 再查不到看名稱 (模擬車是 # 開頭)
  const simulated = useCallback(
    (v: TrackVehicle) => (v.isReal ?? names?.amrs.find((a) => a.amrId === v.amrId)?.isReal ?? !v.amrId.startsWith("#")) === false,
    [names],
  );

  const source = useCallback(
    (id: string, out: VehicleFrame) => {
      const v = vehicles.get(id);
      const now = timeRef.current;
      const p = v && incidentPoseAt(v, now, GONE_MS);
      if (!v || !p) return false;
      const sw15 = usesSW15Frame(id, simulated(v));
      const at = sw15 ? sw15ToMap(p.x, p.y) : p;
      out.x = at.x;
      out.y = at.y;
      out.yaw = ((p.yaw + (sw15 ? 180 : 0)) * Math.PI) / 180;
      out.loaded = incidentLoadedAt(v, now);
      out.lift = out.loaded ? CARRY_LIFT : 0;
      out.ring = amrColor(id);
      out.dim = false;
      out.alert = 0;
      return true;
    },
    [vehicles, simulated],
  );

  useEffect(() => {
    if (!playing || mode !== "replay") return;
    let raf = 0;
    let last = performance.now();
    let shown = last;
    const tick = (now: number) => {
      timeRef.current = Math.min(duration, timeRef.current + (now - last) * speed);
      last = now;
      cameraRef.current?.invalidate();
      if (timeRef.current >= duration) {
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
  }, [playing, speed, duration, mode]);

  const seek = (ms: number) => {
    timeRef.current = ms;
    setTime(ms);
    cameraRef.current?.invalidate();
  };

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

  const clock = replay ? dayjs(replay.from + time).format("MM/DD HH:mm:ss") : "";
  return (
    <Root data-testid="track-replay">
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
          {mode === "heat" && heat && <HeatLayer3D heat={heat} metric={metric} />}
          {mode === "replay" &&
            (replay?.vehicles ?? []).map((v) => {
              const model = vehicleModelFor(v.amrId, robotTypes);
              const common = {
                id: v.amrId,
                source,
                labelOnHover: false,
                label: <VehicleLabel name={v.amrId} color={amrColor(v.amrId)} lines={[]} />,
              };
              return (
                <ModelBoundary key={v.amrId} resetKeys={[model.url]} fallback={<Vehicle3D model={FORKLIFT_MODEL} {...common} />}>
                  <Vehicle3D model={model} {...common} />
                </ModelBoundary>
              );
            })}
        </Scene3D>
      </div>
      {mode === "replay" && (
        <div className="bar">
          <Button
            size="small"
            type="primary"
            icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
            disabled={!duration}
            onClick={() => {
              if (!playing && timeRef.current >= duration) seek(0);
              setPlaying(!playing);
            }}
            data-testid="track-play"
            aria-label={playing ? t("sim_v2.result.pause") : t("sim_v2.result.play")}
          />
          <Select size="small" value={speed} style={{ width: 84 }} options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} onChange={setSpeed} />
          <Slider
            min={0}
            max={Math.max(1, Math.round(duration / 1000))}
            step={1}
            value={time / 1000}
            tooltip={{ formatter: (v) => (replay ? dayjs(replay.from + (v ?? 0) * 1000).format("HH:mm:ss") : "") }}
            onChange={(v) => seek(v * 1000)}
            data-testid="track-timeline"
          />
          <span className="time" data-testid="track-time">
            {clock}
          </span>
        </div>
      )}
    </Root>
  );
};

export default TrackReplay3D;
