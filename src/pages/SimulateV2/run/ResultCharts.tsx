/**
 * 結果的兩張圖: 每台車的時間分配 (堆疊橫條), 每小時產生 / 完成幾板 (折線).
 * 顏色照 colors.ts; 字用文字色, 不用資料的顏色; 都有圖例, 也都有表格可以看數字.
 */
import { FC, useMemo, useState } from "react";
import { Segmented, Table } from "antd";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import styled from "styled-components";
import { useCanvasColors } from "../editor/hooks";
import type { SimResult, TimeBucket } from "../engine/types";
import { TIME_BUCKETS } from "../engine/types";
import { STATE_ORDER, stateColors } from "./colors";
import { fmtClock, fmtMinutes, fmtPercent } from "./format";

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 4px 0 8px;
  font-size: 12px;
  color: var(--c-text-secondary);

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .line {
    width: 14px;
    height: 2px;
    border-radius: 1px;
  }
`;

const TipBox = styled.div`
  padding: 6px 10px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  font-size: 12px;
  color: var(--c-text);

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    line-height: 1.7;
  }
  i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  .v {
    margin-left: auto;
    padding-left: 12px;
    font-variant-numeric: tabular-nums;
  }
`;

const idx = (b: TimeBucket) => TIME_BUCKETS.indexOf(b);

export const VehicleTimeChart: FC<{ result: SimResult; width: number }> = ({ result, width }) => {
  const { t } = useTranslation();
  const canvas = useCanvasColors();
  const colors = stateColors(canvas.dark);
  const [view, setView] = useStateView();
  const data = useMemo(
    () =>
      result.vehicles.map((v) => {
        const row: Record<string, string | number> = { name: v.name };
        for (const s of STATE_ORDER) row[s] = Math.round((v.time[idx(s)] / 60) * 10) / 10;
        return row;
      }),
    [result],
  );
  const span = Math.max(1, result.endSec - result.warmupSec);
  const height = 30 + data.length * 26;

  return (
    <div data-testid="simv2-vehicle-chart">
      <Segmented size="small" value={view} onChange={setView} options={[{ value: "chart", label: t("sim_v2.result.view_chart") }, { value: "table", label: t("sim_v2.result.view_table") }]} />
      <Legend>
        {STATE_ORDER.map((s) => (
          <span key={s}>
            <i style={{ background: colors[s] }} />
            {t(`sim_v2.state.${s}`)}
          </span>
        ))}
      </Legend>
      {view === "chart" ? (
        <BarChart width={width} height={height} data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={canvas.dark ? "#2c2c2a" : "#e1e0d9"} />
          <XAxis type="number" tick={{ fontSize: 11, fill: canvas.muted }} stroke={canvas.dark ? "#383835" : "#c3c2b7"} unit={t("sim_v2.unit.min_short")} />
          <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 11, fill: canvas.ink }} stroke={canvas.dark ? "#383835" : "#c3c2b7"} />
          <Tooltip
            cursor={{ fill: canvas.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox>
                  <b>{label}</b>
                  {STATE_ORDER.map((s) => {
                    const p = payload.find((x) => x.dataKey === s);
                    return p ? (
                      <div className="row" key={s}>
                        <i style={{ background: colors[s] }} />
                        {t(`sim_v2.state.${s}`)}
                        <span className="v">{t("sim_v2.result.minutes", { value: p.value })}</span>
                      </div>
                    ) : null;
                  })}
                </TipBox>
              ) : null
            }
          />
          {STATE_ORDER.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="time"
              fill={colors[s]}
              stroke={canvas.paper}
              strokeWidth={2}
              maxBarSize={18}
              radius={i === STATE_ORDER.length - 1 ? [0, 4, 4, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      ) : (
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          scroll={{ x: 640 }}
          dataSource={result.vehicles}
          columns={[
            { title: t("sim_v2.result.vehicle"), dataIndex: "name", fixed: "left", width: 90 },
            ...STATE_ORDER.map((s) => ({
              title: t(`sim_v2.state.${s}`),
              key: s,
              align: "right" as const,
              render: (_: unknown, v: SimResult["vehicles"][number]) => fmtMinutes(v.time[idx(s)]),
            })),
            { title: t("sim_v2.result.busy"), key: "busy", align: "right" as const, render: (_: unknown, v) => fmtPercent(v.time.slice(1).reduce((a, b) => a + b, 0) / span) },
            { title: t("sim_v2.result.tasks"), dataIndex: "tasks", align: "right" as const },
            { title: t("sim_v2.result.distance"), key: "dist", align: "right" as const, render: (_: unknown, v) => `${Math.round(v.distance)} m` },
          ]}
        />
      )}
      <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{t("sim_v2.result.time_note")}</div>
    </div>
  );
};

/** 圖 / 表 切換 (記在元件裡就好) */
function useStateView() {
  return useState<"chart" | "table">("chart");
}

export const HourlyChart: FC<{ result: SimResult; width: number }> = ({ result, width }) => {
  const { t } = useTranslation();
  const canvas = useCanvasColors();
  const colors = stateColors(canvas.dark);
  const [view, setView] = useStateView();
  const data = result.hourly.map((h, i) => ({
    hour: fmtClock(result.startClock, i * 3600, false),
    created: h.created,
    done: h.done,
  }));
  // 兩條線都用分類色的前兩個 (藍、橘)
  const cCreated = colors.empty;
  const cDone = colors.loaded;
  return (
    <div data-testid="simv2-hourly-chart">
      <Segmented size="small" value={view} onChange={setView} options={[{ value: "chart", label: t("sim_v2.result.view_chart") }, { value: "table", label: t("sim_v2.result.view_table") }]} />
      <Legend>
        <span>
          <i className="line" style={{ background: cCreated }} />
          {t("sim_v2.result.hourly_created")}
        </span>
        <span>
          <i className="line" style={{ background: cDone }} />
          {t("sim_v2.result.hourly_done")}
        </span>
      </Legend>
      {view === "chart" ? (
        <LineChart width={width} height={220} data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid vertical={false} stroke={canvas.dark ? "#2c2c2a" : "#e1e0d9"} />
          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: canvas.muted }} stroke={canvas.dark ? "#383835" : "#c3c2b7"} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: canvas.muted }} stroke={canvas.dark ? "#383835" : "#c3c2b7"} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox>
                  <b>{label}</b>
                  <div className="row">
                    <i style={{ background: cCreated }} />
                    {t("sim_v2.result.hourly_created")}
                    <span className="v">{payload.find((p) => p.dataKey === "created")?.value}</span>
                  </div>
                  <div className="row">
                    <i style={{ background: cDone }} />
                    {t("sim_v2.result.hourly_done")}
                    <span className="v">{payload.find((p) => p.dataKey === "done")?.value}</span>
                  </div>
                </TipBox>
              ) : null
            }
          />
          <Line type="linear" dataKey="created" stroke={cCreated} strokeWidth={2} dot={{ r: 4, fill: cCreated, stroke: canvas.paper, strokeWidth: 2 }} isAnimationActive={false} />
          <Line type="linear" dataKey="done" stroke={cDone} strokeWidth={2} dot={{ r: 4, fill: cDone, stroke: canvas.paper, strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      ) : (
        <Table
          size="small"
          pagination={false}
          rowKey="hour"
          dataSource={data}
          columns={[
            { title: t("sim_v2.result.hour"), dataIndex: "hour" },
            { title: t("sim_v2.result.hourly_created"), dataIndex: "created", align: "right" as const },
            { title: t("sim_v2.result.hourly_done"), dataIndex: "done", align: "right" as const },
          ]}
        />
      )}
      <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{t("sim_v2.result.hourly_note")}</div>
    </div>
  );
};
