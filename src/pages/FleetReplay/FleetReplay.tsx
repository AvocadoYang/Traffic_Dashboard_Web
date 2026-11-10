import { FC, lazy, Suspense, useMemo, useState } from "react";
import { Alert, DatePicker, Empty, Segmented, Select, Spin } from "antd";
import Layout, { Content } from "antd/es/layout/layout";
import dayjs, { Dayjs } from "dayjs";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Fleet3DBoundary from "@/components/Fleet3D/Fleet3DBoundary";
import { webglAvailable } from "@/components/Fleet3D/webgl";
import {
  HeatMetric,
  NETWORK_METRICS,
  TRAFFIC_METRICS,
  badness,
  heatRgb,
  heatValue,
} from "@/components/Fleet3D/heatColors";
import type { HeatCell } from "@/api/useTrackArchive";
import useMap from "@/api/useMap";
import { useTrackHeat, useTrackReplay } from "@/api/useTrackArchive";
import { reportFeatureUse } from "@/api/useAchievements";
import { mq } from "@/styles/responsive";

// three.js 很大, 打開這一頁才載
const TrackReplay3D = lazy(() => import("@/components/Fleet3D/TrackReplay3D"));

const { RangePicker } = DatePicker;

const StyledLayout = styled(Layout)`
  height: var(--app-height);
  overflow: hidden;
`;

const StyledContent = styled(Content)`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--c-bg-muted);

  ${mq.pad} {
    padding: var(--space-md);
  }
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);

  .ant-picker {
    flex: 0 1 360px;
    min-width: 0;
  }
`;

const Stage = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--space-sm);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 8px;
`;

const Center = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
`;

const Legend = styled.div`
  position: absolute;
  right: 20px;
  top: 20px;
  z-index: 5;
  width: 220px;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);

  .ramp {
    height: 8px;
    margin: 6px 0 2px;
    border-radius: 4px;
  }
  .ends {
    display: flex;
    justify-content: space-between;
    color: var(--c-text-muted);
  }
  ol {
    margin: 8px 0 0;
    padding-left: 18px;
  }
  li {
    margin-bottom: 2px;
  }
`;

type Mode = "replay" | "heat";

const PRESETS = [
  { key: "15m", ms: 15 * 60_000 },
  { key: "1h", ms: 3600_000 },
  { key: "6h", ms: 6 * 3600_000 },
] as const;
const CELLS = [0.5, 1, 2];
const MAX_RANGE_MS = 6 * 3600_000;
const KEEP_MS = 7 * 24 * 3600_000;

const rampCss = `linear-gradient(90deg, ${[0, 0.35, 0.65, 1].map((v) => `rgb(${heatRgb(v).join(",")})`).join(", ")})`;

const ALL_METRICS: HeatMetric[] = [...TRAFFIC_METRICS, ...NETWORK_METRICS];
const isMetric = (v: string | null): v is HeatMetric => !!v && (ALL_METRICS as string[]).includes(v);

const formatSec = (sec: number) => {
  if (sec < 90) return `${Math.round(sec)} s`;
  if (sec < 5400) return `${Math.round(sec / 60)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
};

/**
 * 車隊回放與熱度圖 (/fleet-replay): 看過去一段時間 (最長 6 小時、保留 7 天) 各台車怎麼走,
 * 或哪裡最常有車待著、開過。資料是後端每 2 秒記一次的位置 (TrackArchive)。
 */
const FleetReplay: FC = () => {
  const { t } = useTranslation();
  const { data: map } = useMap();
  // 網址 ?mode=heat 直接開熱度圖 (可以貼連結給別人)
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get("mode") === "heat" ? "heat" : "replay";
  // ?mode=heat&metric=wifi 也可以直接開某一種熱度圖
  const urlMetric = params.get("metric");
  const [metric, setMetricState] = useState<HeatMetric>(isMetric(urlMetric) ? urlMetric : "dwell");
  const setMode = (m: Mode) => setParams(m === "heat" ? { mode: "heat", metric } : {}, { replace: true });
  const setMetric = (m: HeatMetric) => {
    setMetricState(m);
    if (mode === "heat") setParams({ mode: "heat", metric: m }, { replace: true });
  };
  const isNetwork = NETWORK_METRICS.includes(metric);
  const [cell, setCell] = useState(1);
  // 查詢範圍固定在選的那一刻 (不要跟著時間一直變, 不然每次重畫都重新查)
  const [range, setRange] = useState(() => ({ from: Date.now() - 3600_000, to: Date.now() }));

  // 看到資料了才算用過 (「觀察家」成就)
  const replayQ = useTrackReplay(mode === "replay" ? range : null);
  const heatQ = useTrackHeat(mode === "heat" ? range : null, cell);
  const active = mode === "replay" ? replayQ : heatQ;

  const preset = (ms: number) => setRange({ from: Date.now() - ms, to: Date.now() });
  const onRange = (v: null | [Dayjs | null, Dayjs | null]) => {
    if (!v?.[0] || !v[1]) return;
    const from = v[0].valueOf();
    const to = Math.min(v[1].valueOf(), from + MAX_RANGE_MS);
    setRange({ from, to });
  };

  // 熱點: 熱度最高的幾格, 標示離哪個點位最近
  const hotspots = useMemo(() => {
    const heat = heatQ.data;
    if (mode !== "heat" || !heat) return [];
    const locations = map?.locations ?? [];
    return heat.cells
      .filter((c) => badness(c, metric) !== null)
      .sort((a, b) => (badness(b, metric) ?? 0) - (badness(a, metric) ?? 0))
      .slice(0, 5)
      .map((c) => {
        const x = (c.ix + 0.5) * heat.cell;
        const y = (c.iy + 0.5) * heat.cell;
        let best: { id: string; d: number } | null = null;
        for (const l of locations) {
          const d = Math.hypot(l.x - x, l.y - y);
          if (!best || d < best.d) best = { id: l.locationId.toString(), d };
        }
        return { key: `${c.ix},${c.iy}`, cell: c, near: best && best.d < 5 ? best.id : null, x, y };
      });
  }, [mode, heatQ.data, map, metric]);

  if (mode === "replay" && replayQ.data) reportFeatureUse("fleet_replay");
  if (mode === "heat" && heatQ.data) reportFeatureUse("fleet_heatmap");
  const empty =
    mode === "replay"
      ? !replayQ.data?.vehicles.length
      : !heatQ.data?.cells.some((c) => {
          // 延遲 / 訊號: 有值就算有資料 (0 ms 也是資料); 車流 / 事件次數: 大於 0 才算
          const v = heatValue(c, metric);
          return metric === "latency" || metric === "wifi" ? v !== null : (v ?? 0) > 0;
        });
  const emptyText = !isNetwork
    ? t("fleet_replay.empty")
    : metric === "wifi"
    ? t("fleet_replay.empty_wifi")
    : metric === "latency"
    ? t("fleet_replay.empty_network_real")
    : t("fleet_replay.empty_events");

  /** 熱點旁邊的數字 */
  const hotValue = (c: HeatCell) => {
    switch (metric) {
      case "dwell":
        return formatSec(c.dwell);
      case "passes":
        return t("fleet_replay.times", { n: c.passes });
      case "latency":
        return t("fleet_replay.latency_value", { avg: c.latency ?? 0, max: c.latencyMax ?? 0 });
      case "wifi":
        return t("fleet_replay.wifi_value", { avg: c.wifi ?? 0, min: c.wifiMin ?? 0 });
      default:
        return t("fleet_replay.times", { n: heatValue(c, metric) ?? 0 });
    }
  };
  const rampEnds: [string, string] =
    metric === "latency"
      ? [t("fleet_replay.latency_low"), t("fleet_replay.latency_high")]
      : metric === "wifi"
      ? [t("fleet_replay.wifi_strong"), t("fleet_replay.wifi_weak")]
      : [t("fleet_replay.cold"), t("fleet_replay.hot")];
  const supported = webglAvailable();

  return (
    <StyledLayout>
      <Header />
      <StyledContent>
        <Filters>
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: "replay", label: t("fleet_replay.mode_replay") },
              { value: "heat", label: t("fleet_replay.mode_heat") },
            ]}
          />
          <Segmented<string>
            value={PRESETS.find((p) => Math.abs(range.to - range.from - p.ms) < 60_000 && Date.now() - range.to < 60_000)?.key ?? ""}
            onChange={(k) => preset(PRESETS.find((p) => p.key === k)!.ms)}
            options={PRESETS.map((p) => ({ value: p.key, label: t(`fleet_replay.last_${p.key}`) }))}
          />
          <RangePicker
            showTime
            allowClear={false}
            value={[dayjs(range.from), dayjs(range.to)]}
            onChange={onRange}
            disabledDate={(d) => d.valueOf() < Date.now() - KEEP_MS || d.isAfter(dayjs())}
          />
          {mode === "heat" && (
            <>
              <Select<HeatMetric>
                value={metric}
                onChange={setMetric}
                style={{ width: 170 }}
                options={[
                  {
                    label: t("fleet_replay.group_traffic"),
                    options: TRAFFIC_METRICS.map((m) => ({ value: m, label: t(`fleet_replay.metric_${m}`) })),
                  },
                  {
                    label: t("fleet_replay.group_network"),
                    options: NETWORK_METRICS.map((m) => ({ value: m, label: t(`fleet_replay.metric_${m}`) })),
                  },
                ]}
              />
              <Select value={cell} onChange={setCell} style={{ width: 110 }} options={CELLS.map((c) => ({ value: c, label: t("fleet_replay.cell", { m: c }) }))} />
            </>
          )}
        </Filters>
        <Alert
          type="info"
          showIcon
          message={mode === "heat" && isNetwork ? t("fleet_replay.network_hint") : t("fleet_replay.hint")}
        />
        <Stage>
          {!supported ? (
            <Center>
              <Empty description={t("fleet_replay.no_webgl")} />
            </Center>
          ) : active.isError ? (
            <Center>
              <Empty description={t("fleet_replay.load_failed")} />
            </Center>
          ) : (
            <>
              <Fleet3DBoundary>
                <Suspense fallback={<Center><Spin /></Center>}>
                  <TrackReplay3D mode={mode} replay={replayQ.data ?? null} heat={heatQ.data ?? null} metric={metric} />
                </Suspense>
              </Fleet3DBoundary>
              {active.isFetching && (
                <Center style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <Spin />
                </Center>
              )}
              {!active.isFetching && active.data && empty && (
                <Center style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <Empty description={mode === "heat" ? emptyText : t("fleet_replay.empty")} />
                </Center>
              )}
              {mode === "heat" && heatQ.data && !empty && (
                <Legend>
                  <div>{t(`fleet_replay.legend_${metric}`)}</div>
                  <div className="ramp" style={{ background: rampCss }} />
                  <div className="ends">
                    <span>{rampEnds[0]}</span>
                    <span>{rampEnds[1]}</span>
                  </div>
                  <ol>
                    {hotspots.map((h) => (
                      <li key={h.key}>
                        {h.near ? t("fleet_replay.near_point", { id: h.near }) : `(${h.x.toFixed(1)}, ${h.y.toFixed(1)})`}
                        {" · "}
                        {hotValue(h.cell)}
                      </li>
                    ))}
                  </ol>
                </Legend>
              )}
            </>
          )}
        </Stage>
      </StyledContent>
    </StyledLayout>
  );
};

export default FleetReplay;
