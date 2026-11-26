import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Popover, Select, Slider, Tag, message } from "antd";
import { CaretRightOutlined, PauseOutlined, VideoCameraOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import styled from "styled-components";
import useMap from "@/api/useMap";
import useAMRsample from "@/api/useAMRsample";
import type { TimelineEvent, TimelineEventKind, TrackHeatData, TrackReplayData, TrackVehicle } from "@/api/useTrackArchive";
import { buildMapImageMatrix, getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";
import { amrColor } from "@/components/CanvasMap/draw";
import { isPointAreaType } from "@/utils/map/areaTypes";
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
    .track {
      position: relative;
      flex: 1 1 auto;
      min-width: 0;
      .ant-slider {
        margin: 12px 8px 14px;
      }
    }
    /* 時間軸上的事件標記: 浮在滑桿上方, 點一下跳到那個時間 */
    .ticks {
      position: absolute;
      left: 8px;
      right: 8px;
      top: 0;
      height: 10px;
      pointer-events: none;
    }
    .tick {
      position: absolute;
      top: 0;
      width: 4px;
      height: 10px;
      margin-left: -2px;
      border: 0;
      padding: 0;
      border-radius: 2px;
      cursor: pointer;
      pointer-events: auto;
      opacity: 0.9;
    }
    .tick:hover {
      opacity: 1;
      transform: scaleX(1.8);
    }
  }
  > .focus {
    padding: 2px 4px 0;
    font-size: 12px;
  }
`;

const EventList = styled.div`
  width: 340px;
  max-height: 320px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  button {
    display: flex;
    gap: 8px;
    align-items: baseline;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--c-text);
    font-size: 12px;
  }
  button:hover {
    background: var(--c-bg-muted, rgba(128, 128, 128, 0.15));
  }
  .at {
    font-variant-numeric: tabular-nums;
    color: var(--c-text-secondary);
    white-space: nowrap;
  }
`;

/** 事件標記的顏色 (跟事件清單裡的小圓點一致) */
const EVENT_COLOR: Record<TimelineEventKind, string> = {
  alarm: "#f5222d",
  warning: "#fa8c16",
  estop: "#eb2f96",
  disconnect: "#722ed1",
  localization: "#1677ff",
  roam: "#13c2c2",
};
/** 跳到事件前幾毫秒 (先看到事情發生前一點點) */
const EVENT_LEAD_MS = 5000;

type Props = {
  mode: "replay" | "heat";
  replay: TrackReplayData | null;
  heat: TrackHeatData | null;
  metric: HeatMetric;
  /** 時間軸事件 (告警、急停、斷線 ...); 沒有就不畫 */
  events?: TimelineEvent[];
  eventsTruncated?: boolean;
  /** 從任務跳過來時要標出的車: 其他車變淡 */
  focusAmr?: string | null;
  onClearFocus?: () => void;
};

const TrackReplay3D: FC<Props> = ({ mode, replay, heat, metric, events = [], eventsTruncated = false, focusAmr = null, onClearFocus }) => {
  const { t } = useTranslation();
  const { data: map } = useMap();
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


  const source = useCallback(
    (id: string, out: VehicleFrame) => {
      const v = vehicles.get(id);
      const now = timeRef.current;
      const p = v && incidentPoseAt(v, now, GONE_MS);
      if (!v || !p) return false;
      out.x = p.x;
      out.y = p.y;
      out.yaw = (p.yaw * Math.PI) / 180;
      out.loaded = incidentLoadedAt(v, now);
      out.lift = out.loaded ? CARRY_LIFT : 0;
      out.ring = amrColor(id);
      out.dim = !!focusAmr && id !== focusAmr;
      out.alert = 0;
      return true;
    },
    [vehicles, focusAmr],
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

  const sceneRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);

  /** 跳到事件發生前幾秒, 鏡頭移到出事的地方 (事件沒有座標就用那台車那時候的位置) */
  const jumpTo = (e: TimelineEvent) => {
    if (!replay) return;
    const rel = e.at - replay.from;
    seek(Math.max(0, Math.min(duration, rel - EVENT_LEAD_MS)));
    const car = vehicles.get(e.amrId);
    const pose = e.x !== undefined && e.y !== undefined ? { x: e.x, y: e.y } : car ? incidentPoseAt(car, rel, GONE_MS) : null;
    if (pose) cameraRef.current?.flyTo(pose.x, pose.y, 12);
  };

  const stopRecording = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  /** 從頭播一遍並把 3D 畫面錄成 webm 下載 (播放速度就是目前選的倍速; 播完或按暫停就存檔) */
  const startRecording = () => {
    const canvas = sceneRef.current?.querySelector("canvas");
    if (!replay || !canvas || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      message.warning(t("fleet_replay.record_unsupported"));
      return;
    }
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
    const parts: Blob[] = [];
    const startedAt = replay.from;
    rec.ondataavailable = (e) => {
      if (e.data.size) parts.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((x) => x.stop());
      recorderRef.current = null;
      setRecording(false);
      setPlaying(false);
      if (!parts.length) return;
      const url = URL.createObjectURL(new Blob(parts, { type: "video/webm" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `fleet-replay-${dayjs(startedAt).format("YYYYMMDD-HHmmss")}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      message.success(t("fleet_replay.record_saved"));
    };
    recorderRef.current = rec;
    seek(0);
    rec.start(1000);
    setRecording(true);
    setPlaying(true);
  };
  // 錄的時候播放停了 (播完、按暫停、換了範圍) 就結束存檔
  useEffect(() => {
    if (recording && !playing) stopRecording();
  }, [recording, playing, stopRecording]);
  useEffect(() => () => stopRecording(), [stopRecording]);

  const eventList = (
    <EventList>
      {events.map((e, i) => (
        <button key={`${e.at}-${i}`} type="button" onClick={() => jumpTo(e)}>
          <span style={{ color: EVENT_COLOR[e.kind] }}>●</span>
          <span className="at">{dayjs(e.at).format("HH:mm:ss")}</span>
          <span>
            {e.amrId} · {e.text}
          </span>
        </button>
      ))}
      {eventsTruncated && <div style={{ padding: 6, fontSize: 12 }}>{t("fleet_replay.events_truncated")}</div>}
    </EventList>
  );

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
      <div className="scene" ref={sceneRef}>
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
          <div className="track">
            <div className="ticks">
              {duration > 0 &&
                events.map((e, i) => {
                  const pos = ((e.at - (replay?.from ?? 0)) / duration) * 100;
                  if (pos < 0 || pos > 100) return null;
                  return (
                    <button
                      key={`${e.at}-${i}`}
                      type="button"
                      className="tick"
                      title={`${dayjs(e.at).format("HH:mm:ss")} ${e.amrId} ${e.text}`}
                      style={{ left: `${pos}%`, background: EVENT_COLOR[e.kind] }}
                      onClick={() => jumpTo(e)}
                    />
                  );
                })}
            </div>
            <Slider
              min={0}
              max={Math.max(1, Math.round(duration / 1000))}
              step={1}
              value={time / 1000}
              tooltip={{ formatter: (v) => (replay ? dayjs(replay.from + (v ?? 0) * 1000).format("HH:mm:ss") : "") }}
              onChange={(v) => seek(v * 1000)}
              data-testid="track-timeline"
            />
          </div>
          <span className="time" data-testid="track-time">
            {clock}
          </span>
          <Popover trigger="click" placement="topRight" content={events.length ? eventList : t("fleet_replay.events_none")}>
            <Button size="small" icon={<UnorderedListOutlined />} data-testid="track-events">
              {t("fleet_replay.events_btn", { n: events.length })}
            </Button>
          </Popover>
          <Button
            size="small"
            danger={recording}
            icon={<VideoCameraOutlined />}
            disabled={!duration}
            onClick={recording ? stopRecording : startRecording}
            data-testid="track-record"
          >
            {recording ? t("fleet_replay.recording_stop") : t("fleet_replay.record_btn")}
          </Button>
        </div>
      )}
      {mode === "replay" && focusAmr && (
        <div className="focus">
          <Tag closable onClose={onClearFocus} color="blue">
            {t("fleet_replay.focus_chip", { id: focusAmr })}
          </Tag>
        </div>
      )}
    </Root>
  );
};

export default TrackReplay3D;
