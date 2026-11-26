import { useActiveMission } from "@/sockets/useMissions";
import { etaText } from "@/utils/eta";
import { CSSProperties, FC, lazy, ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Empty, Spin } from "antd";
import {
  CheckCircleFilled,
  CompressOutlined,
  ExpandOutlined,
  LeftOutlined,
  PauseOutlined,
  RightOutlined,
  CaretRightOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import styled, { keyframes } from "styled-components";
import BrandLogo from "@/components/BrandLogo";
import CanvasMap from "@/components/CanvasMap/CanvasMap";
import Fleet3DBoundary from "@/components/Fleet3D/Fleet3DBoundary";
import { webglAvailable } from "@/components/Fleet3D/webgl";
import { useDailyReport } from "@/api/useAchievements";
import { useAllAmrStatus, useBattery, useIsWorking } from "@/sockets/useAMRInfo";
import { useWarningId } from "@/sockets/useWarning";
import useMap from "@/api/useMap";
import { useAtomValue } from "jotai";
import { currentMapIdAtom } from "@/atoms/map/mapSelectionAtoms";
import { batteryLevel, contentView, parseInterval, parseSlides, SlideKey, stepIndex } from "./slides";

// three.js 很大, 輪播到地圖才載
const LiveFleet3D = lazy(() => import("@/components/Fleet3D/LiveFleet3D"));

/**
 * 看板模式 (/kiosk): 給中控室電視 / 客戶展示用的全螢幕輪播, 不用操作:
 * 即時地圖 → 今日戰報 → 車輛狀態與電量 → 告警, 每頁停 15 秒。
 * 網址可調: ?interval=30 (秒) ?slides=map,fleet (只播這幾頁、照這個順序)。
 * 鍵盤: ← → 換頁、空白鍵暫停 / 繼續、F 全螢幕、Esc 離開 (回首頁)。滑鼠閒置 3 秒自動隱藏。
 */

const IDLE_HIDE_MS = 3000;

const progress = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

const Root = styled.div<{ $idle: boolean }>`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
  color: var(--c-text);
  cursor: ${(p) => (p.$idle ? "none" : "default")};
  user-select: none;
  z-index: 50;

  > .top {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 14px 28px;
    border-bottom: 1px solid var(--c-border);
    .title {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .grow {
      flex: 1 1 auto;
    }
    .clock {
      font-size: 24px;
      font-variant-numeric: tabular-nums;
      color: var(--c-text-secondary);
    }
  }
  > .stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
  > .bar {
    flex: 0 0 auto;
    position: relative;
    height: 4px;
    background: var(--c-border);
    .fill {
      height: 100%;
      background: var(--c-header-accent, var(--c-text));
      transform-origin: left;
      animation: ${progress} var(--dur) linear forwards;
    }
  }
`;

const Controls = styled.div<{ $idle: boolean }>`
  position: absolute;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--c-bg-muted);
  border: 1px solid var(--c-border);
  opacity: ${(p) => (p.$idle ? 0 : 0.95)};
  transition: opacity 0.3s;
  pointer-events: ${(p) => (p.$idle ? "none" : "auto")};
  z-index: 2;
  button {
    border: 0;
    background: transparent;
    color: var(--c-text);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
  }
  button:hover {
    background: var(--c-bg-subtle);
  }
  .dot {
    width: 10px;
    height: 10px;
    padding: 0;
    border-radius: 50%;
    background: var(--c-border-strong);
  }
  .dot.on {
    background: var(--c-header-accent, var(--c-text));
  }
`;

const Page = styled.div`
  position: absolute;
  inset: 0;
  padding: 40px 56px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  overflow: hidden;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  flex: 1 1 auto;
  min-height: 0;
  align-content: center;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Big = styled.div`
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-border);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  .label {
    font-size: 20px;
    color: var(--c-text-secondary);
  }
  .value {
    font-size: clamp(48px, 7vw, 104px);
    font-weight: 700;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
  }
  .unit {
    font-size: 0.35em;
    font-weight: 500;
    margin-left: 8px;
    color: var(--c-text-secondary);
  }
  .delta {
    font-size: 18px;
    color: var(--c-text-muted);
  }
  .delta.up {
    color: var(--c-success);
  }
  .delta.down {
    color: var(--c-danger);
  }
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  align-content: start;
  overflow: hidden;
  flex: 1 1 auto;
`;

const Tile = styled.div<{ $off: boolean }>`
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: ${(p) => (p.$off ? 0.5 : 1)};
  .name {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 22px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .light {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-text-muted);
  }
  .light.on {
    background: var(--c-success);
  }
  .state {
    font-size: 16px;
    color: var(--c-text-secondary);
  }
  .batt {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 22px;
    font-variant-numeric: tabular-nums;
  }
  .track {
    flex: 1 1 auto;
    height: 12px;
    border-radius: 6px;
    background: var(--c-border);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 6px;
  }
  .fill.ok {
    background: var(--c-success);
  }
  .fill.warn {
    background: var(--c-warning);
  }
  .fill.low {
    background: var(--c-danger);
  }
`;

const Heading = styled.div`
  font-size: 30px;
  font-weight: 600;
`;

const AlarmRow = styled.div`
  display: flex;
  gap: 20px;
  align-items: baseline;
  padding: 16px 24px;
  border-radius: 12px;
  border: 1px solid var(--c-danger);
  background: var(--c-bg-subtle);
  font-size: 24px;
  .car {
    font-weight: 700;
    min-width: 120px;
  }
  .code {
    color: var(--c-danger);
    font-variant-numeric: tabular-nums;
  }
`;

const AllClear = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: var(--c-success);
  font-size: 40px;
  .anticon {
    font-size: 120px;
  }
`;

const Center = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 跟昨天比: 一行小字 (昨天是 0 就不比) */
const Delta: FC<{ today: number; yesterday: number; goodWhenUp?: boolean }> = ({ today, yesterday, goodWhenUp = true }) => {
  const { t } = useTranslation();
  if (!yesterday) return <div className="delta">{t("kiosk.yesterday", { n: fmtNum(yesterday) })}</div>;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  const good = pct === 0 ? null : goodWhenUp ? pct > 0 : pct < 0;
  return (
    <div className={`delta ${good === null ? "" : good ? "up" : "down"}`}>
      {t("kiosk.vs_yesterday", { n: fmtNum(yesterday), pct: `${pct > 0 ? "+" : ""}${pct}` })}
    </div>
  );
};

const MapSlide: FC = () => {
  const [use2d, setUse2d] = useState(() => !webglAvailable());
  const { data: map } = useMap();
  const mapId = useAtomValue(currentMapIdAtom);
  // 點位 / 路線實際有東西的範圍放滿畫面 (整張底圖常常比內容大很多)
  const view = useMemo(() => {
    const pts = [...(map?.locations ?? []).map((l) => ({ x: l.x, y: l.y })), ...(map?.roads ?? []).flatMap((r) => [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y2 }])];
    const v = contentView(pts, window.innerWidth / Math.max(1, window.innerHeight - 70));
    // 看板直接開 (沒經過首頁選地圖) 時 mapId 是 null; LiveFleet3D 用「相等」判斷是不是同一張地圖, 照原值帶過去
    return v ? { mapId: mapId as string, ...v } : null;
  }, [map, mapId]);
  if (use2d) return <CanvasMap />;
  return (
    <Fleet3DBoundary onUse2d={() => setUse2d(true)}>
      <Suspense
        fallback={
          <Center>
            <Spin size="large" />
          </Center>
        }
      >
        <LiveFleet3D preferredView={view} />
      </Suspense>
    </Fleet3DBoundary>
  );
};

const ReportSlide: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useDailyReport();
  if (isLoading) return <Center><Spin size="large" /></Center>;
  if (isError || !data) return <Center><Empty description={t("kiosk.no_data")} /></Center>;
  const { today, yesterday } = data;
  const cards: { label: string; value: string; unit?: string; delta: ReactNode }[] = [
    { label: t("kiosk.completed"), value: fmtNum(today.completed), unit: t("kiosk.unit_missions"), delta: <Delta today={today.completed} yesterday={yesterday.completed} /> },
    { label: t("kiosk.cargo_moved"), value: fmtNum(today.cargoMoved), unit: t("kiosk.unit_cargo"), delta: <Delta today={today.cargoMoved} yesterday={yesterday.cargoMoved} /> },
    { label: t("kiosk.distance"), value: fmtNum(today.distanceKm), unit: "km", delta: <Delta today={today.distanceKm} yesterday={yesterday.distanceKm} /> },
    { label: t("kiosk.canceled"), value: fmtNum(today.canceled), unit: t("kiosk.unit_missions"), delta: <Delta today={today.canceled} yesterday={yesterday.canceled} goodWhenUp={false} /> },
    { label: t("kiosk.alarms"), value: fmtNum(today.alarms), unit: t("kiosk.unit_times"), delta: <Delta today={today.alarms} yesterday={yesterday.alarms} goodWhenUp={false} /> },
    {
      label: t("kiosk.top_vehicle"),
      value: today.topVehicle?.amrId ?? "—",
      delta: <div className="delta">{today.topVehicle ? t("kiosk.top_vehicle_n", { n: today.topVehicle.completed }) : ""}</div>,
    },
  ];
  return (
    <Page>
      <Heading>{t("kiosk.report_title", { date: dayjs(today.date).format("YYYY/MM/DD") })}</Heading>
      <Cards>
        {cards.map((c) => (
          <Big key={c.label}>
            <div className="label">{c.label}</div>
            <div className="value">
              {c.value}
              {c.unit && <span className="unit">{c.unit}</span>}
            </div>
            {c.delta}
          </Big>
        ))}
      </Cards>
    </Page>
  );
};

const VehicleTile: FC<{ amrId: string; online: boolean }> = ({ amrId, online }) => {
  const { t } = useTranslation();
  const { battery } = useBattery(amrId);
  const { isWorking } = useIsWorking(amrId);
  const { activeMission } = useActiveMission(amrId);
  const eta = activeMission ? etaText(activeMission, Date.now(), t) : null;
  const level = batteryLevel(battery);
  return (
    <Tile $off={!online}>
      <div className="name">
        <span className={`light ${online ? "on" : ""}`} />
        {amrId}
      </div>
      <div className="state">
        {!online ? t("kiosk.offline") : isWorking ? t("kiosk.working") : t("kiosk.idle")}
        {online && isWorking && eta && ` · ⏱ ${eta.main}`}
      </div>
      <div className="batt">
        <div className="track">
          <div className={`fill ${level === "unknown" ? "" : level}`} style={{ width: `${Math.max(0, Math.min(100, battery ?? 0))}%` }} />
        </div>
        <span>{battery === undefined ? "—" : `${Math.round(battery)}%`}</span>
      </div>
    </Tile>
  );
};

const FleetSlide: FC = () => {
  const { t } = useTranslation();
  const cars = useAllAmrStatus();
  const online = cars.filter((c) => c.isOnline && !c.isOverdue).length;
  return (
    <Page>
      <Heading>{t("kiosk.fleet_title", { online, total: cars.length })}</Heading>
      {cars.length === 0 ? (
        <Center><Empty description={t("kiosk.no_vehicles")} /></Center>
      ) : (
        <Tiles>
          {cars.map((c) => (
            <VehicleTile key={c.amrId} amrId={c.amrId} online={c.isOnline && !c.isOverdue} />
          ))}
        </Tiles>
      )}
    </Page>
  );
};

const AlarmsSlide: FC = () => {
  const { t } = useTranslation();
  const list = useWarningId();
  const rows = useMemo(
    () => [...(list?.entries() ?? [])].flatMap(([amrId, msgs]) => msgs.map((m) => ({ amrId, ...m }))),
    [list],
  );
  if (!rows.length) {
    return (
      <Page>
        <AllClear>
          <CheckCircleFilled />
          {t("kiosk.all_clear")}
        </AllClear>
      </Page>
    );
  }
  return (
    <Page>
      <Heading>{t("kiosk.alarms_title", { n: rows.length })}</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
        {rows.slice(0, 8).map((r, i) => (
          <AlarmRow key={`${r.amrId}-${r.warningId}-${i}`}>
            <span className="car">{r.amrId}</span>
            <span className="code">{r.warningId}</span>
            <span>{r.info}</span>
          </AlarmRow>
        ))}
        {rows.length > 8 && <div style={{ fontSize: 20 }}>{t("kiosk.more", { n: rows.length - 8 })}</div>}
      </div>
    </Page>
  );
};

const SLIDE_VIEW: Record<SlideKey, FC> = { map: MapSlide, report: ReportSlide, fleet: FleetSlide, alarms: AlarmsSlide };

const Kiosk: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const slides = useMemo(() => parseSlides(params.get("slides")), [params]);
  const intervalMs = useMemo(() => parseInterval(params.get("interval")) * 1000, [params]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [now, setNow] = useState(() => dayjs());
  // 換頁時 +1: 讓進度條的動畫從頭跑
  const [tick, setTick] = useState(0);
  const idleTimer = useRef<number>();

  const go = useCallback(
    (delta: 1 | -1) => {
      setIndex((i) => stepIndex(i, slides.length, delta));
      setTick((n) => n + 1);
    },
    [slides.length],
  );

  // 自動輪播 (暫停、只有一頁時不換)
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = window.setTimeout(() => go(1), intervalMs);
    return () => window.clearTimeout(id);
  }, [paused, slides.length, intervalMs, index, tick, go]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(dayjs()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // 滑鼠 / 鍵盤閒置 3 秒: 隱藏游標和控制列
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_HIDE_MS);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake);
    return () => {
      window.clearTimeout(idleTimer.current);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "Escape" && !document.fullscreenElement) navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen, navigate]);

  // 螢幕不要休眠 (支援的瀏覽器才有; 失敗就算了)
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        const l = await wl?.request("screen");
        if (cancelled) void l?.release();
        else lock = l ?? null;
      } catch {
        // 沒有權限或不支援
      }
    };
    void acquire();
    const onVisible = () => document.visibilityState === "visible" && void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);

  const key = slides[Math.min(index, slides.length - 1)];
  const View = SLIDE_VIEW[key];

  return (
    <Root $idle={idle} data-testid="kiosk">
      <div className="top">
        <BrandLogo />
        <div className="title" data-testid="kiosk-title">{t(`kiosk.slide_${key}`)}</div>
        <div className="grow" />
        <div className="clock">{now.format("YYYY/MM/DD HH:mm:ss")}</div>
      </div>
      <div className="stage">
        <View key={key} />
        <Controls $idle={idle}>
          <button type="button" onClick={() => go(-1)} aria-label={t("kiosk.prev")}><LeftOutlined /></button>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? t("kiosk.resume") : t("kiosk.pause")} data-testid="kiosk-pause">
            {paused ? <CaretRightOutlined /> : <PauseOutlined />}
          </button>
          <button type="button" onClick={() => go(1)} aria-label={t("kiosk.next")}><RightOutlined /></button>
          {slides.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`dot ${i === index ? "on" : ""}`}
              onClick={() => {
                setIndex(i);
                setTick((n) => n + 1);
              }}
              aria-label={t(`kiosk.slide_${s}`)}
            />
          ))}
          <button type="button" onClick={toggleFullscreen} aria-label={t("kiosk.fullscreen")}>
            {fullscreen ? <CompressOutlined /> : <ExpandOutlined />}
          </button>
        </Controls>
      </div>
      <div className="bar">
        {!paused && slides.length > 1 && (
          <div className="fill" key={`${key}-${tick}`} style={{ "--dur": `${intervalMs}ms` } as CSSProperties} />
        )}
      </div>
    </Root>
  );
};

export default Kiosk;
