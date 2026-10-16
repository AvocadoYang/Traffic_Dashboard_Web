/**
 * 車數掃描的結果: 建議台數、兩張圖 (台數對每小時搬運量、台數對 P95 等待)、每個台數的表.
 * 點表格或圖上的台數看那一次的回放.
 *
 * 兩個量的單位不同, 分成兩張圖 (不用雙 Y 軸). 每張圖只有一條線, 不用圖例; 淺色帶是幾個種子裡
 * 最好到最差; 實心點 = 這個台數達標, 空心點 = 沒達標.
 */
import { FC, ReactNode, useMemo, useRef } from "react";
import { Alert, Button, Dropdown, Table, Tag, Tooltip as AntTooltip } from "antd";
import { CheckCircleFilled, CloseCircleFilled, DownOutlined, FileExcelOutlined, PlayCircleOutlined, PrinterOutlined } from "@ant-design/icons";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import styled from "styled-components";
import { useCanvasColors, useElementSize } from "../editor/hooks";
import { docAtom } from "../state/editorAtoms";
import { SweepOutcome, reportOpenAtom, sweepProgressAtom } from "../state/runAtoms";
import { stateColors } from "./colors";
import { startSweep, openSweepPick } from "./controller";
import { fmtDuration, fmtNumber, fmtPercent } from "./format";
import { useExportReport } from "./report/useExportReport";
import { SweepFail, SweepRow, summarizeSweep, sweepHash } from "./sweep";

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--c-bg-muted);
  font-size: 13px;
  color: var(--c-text);
`;

const Card = styled.section`
  padding: 14px 16px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 8px;

  h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
  }
  .simv2-sweep-pass-row > td {
    background: var(--c-bg-subtle);
    font-weight: 600;
  }
`;

const Hero = styled(Card)`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  align-items: center;

  .big {
    font-size: 34px;
    font-weight: 700;
    line-height: 1.1;
    color: var(--c-text);
  }
  .big small {
    margin-left: 4px;
    font-size: 16px;
    font-weight: 500;
  }
  .label {
    font-size: 12px;
    color: var(--c-text-secondary);
  }
  ul {
    margin: 0;
    padding-left: 18px;
    color: var(--c-text-secondary);
    line-height: 1.8;
  }
`;

const Charts = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
`;

const TipBox = styled.div`
  padding: 6px 10px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  font-size: 12px;
  color: var(--c-text);
  line-height: 1.7;
`;

const FAIL_ORDER: SweepFail[] = ["achievement", "wait", "utilization", "deadlock"];

interface Point {
  count: number;
  avg: number;
  band: [number, number];
  pass: boolean | null;
}

/** 單一數列的圖: 平均線 + 最好到最差的淺色帶 + 參考線 */
const MetricChart: FC<{
  title: string;
  unit: string;
  data: Point[];
  width: number;
  color: string;
  refY?: { value: number; label: string } | null;
  refX?: { value: number; label: string } | null;
  format: (v: number) => string;
  onPick: (count: number) => void;
  testId: string;
}> = ({ title, unit, data, width, color, refY, refX, format, onPick, testId }) => {
  const canvas = useCanvasColors();
  const grid = canvas.dark ? "#2c2c2a" : "#e1e0d9";
  const axis = canvas.dark ? "#383835" : "#c3c2b7";
  const { t } = useTranslation();
  return (
    <Card data-testid={testId}>
      <h4>
        {title} <small style={{ fontWeight: 400, color: "var(--c-text-muted)" }}>({unit})</small>
      </h4>
      <ComposedChart
        width={Math.max(280, width)}
        height={230}
        data={data}
        margin={{ top: 16, right: 24, bottom: 4, left: -8 }}
        onClick={(e) => {
          const c = Number(e?.activeLabel);
          if (Number.isFinite(c)) onPick(c);
        }}
        style={{ cursor: "pointer" }}
      >
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="count" tick={{ fontSize: 11, fill: canvas.muted }} stroke={axis} unit={t("sim_v2.sweep.unit_vehicle")} />
        <YAxis tick={{ fontSize: 11, fill: canvas.muted }} stroke={axis} tickFormatter={(v: number) => format(v)} />
        <Tooltip
          cursor={{ stroke: axis }}
          content={({ active, payload }) => {
            const p = active && payload?.length ? (payload[0].payload as Point) : null;
            return p ? (
              <TipBox>
                <b>{t("sim_v2.sweep.n_vehicles", { count: p.count })}</b>
                <div>
                  {t("sim_v2.sweep.tip_avg")} {format(p.avg)} {unit}
                </div>
                <div>
                  {t("sim_v2.sweep.tip_range")} {format(p.band[0])} ~ {format(p.band[1])}
                </div>
                {p.pass !== null && <div>{p.pass ? t("sim_v2.sweep.pass") : t("sim_v2.sweep.fail")}</div>}
                <div style={{ color: "var(--c-text-muted)" }}>{t("sim_v2.sweep.tip_click")}</div>
              </TipBox>
            ) : null;
          }}
        />
        <Area type="linear" dataKey="band" stroke="none" fill={color} fillOpacity={0.16} isAnimationActive={false} />
        {refY && (
          <ReferenceLine
            y={refY.value}
            stroke={canvas.ink}
            strokeOpacity={0.55}
            strokeDasharray="6 4"
            label={{ value: refY.label, position: "insideTopRight", fill: canvas.ink, fontSize: 11 }}
          />
        )}
        {refX && (
          <ReferenceLine
            x={refX.value}
            stroke={canvas.ink}
            strokeOpacity={0.4}
            label={{ value: refX.label, position: "insideTopLeft", fill: canvas.ink, fontSize: 11 }}
          />
        )}
        <Line
          type="linear"
          dataKey="avg"
          stroke={color}
          strokeWidth={2}
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; payload?: Point; index?: number }) => (
            <circle
              key={props.index}
              cx={props.cx}
              cy={props.cy}
              r={4.5}
              stroke={color}
              strokeWidth={2}
              fill={props.payload?.pass === false ? canvas.paper : color}
            />
          )}
          activeDot={{ r: 6, stroke: canvas.paper, strokeWidth: 2, fill: color }}
        />
      </ComposedChart>
    </Card>
  );
};

const SweepResults: FC<{ sweep: SweepOutcome }> = ({ sweep }) => {
  const { t } = useTranslation();
  const store = useStore();
  const doc = useAtomValue(docAtom);
  const progress = useAtomValue(sweepProgressAtom);
  const setReportOpen = useSetAtom(reportOpenAtom);
  const exportReport = useExportReport();
  const canvas = useCanvasColors();
  const color = stateColors(canvas.dark).empty;
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(wrapRef);
  const sum = useMemo(() => summarizeSweep(sweep.runs, sweep.plan, sweep.settings), [sweep]);
  const stale = useMemo(() => sweepHash(doc) !== sweep.hash, [doc, sweep.hash]);
  const s = sweep.settings;
  const running = progress !== null && !sweep.done;
  const demand = sweep.runs[0]?.summary.kpi.demandPerHour ?? 0;
  // 兩張圖並排時各一半寬
  const chartWidth = width >= 760 ? (width - 32 - 14) / 2 - 32 : width - 32 - 32;
  const pick = (count: number) => openSweepPick(store, count, sweep.plan.seeds[0]);

  const failLabel = (f: SweepFail) => t(`sim_v2.sweep.fail_${f}`);
  const throughput: Point[] = sum.rows.map((r) => ({ count: r.count, avg: r.throughput.avg, band: [r.throughput.min, r.throughput.max], pass: r.pass }));
  const wait: Point[] = sum.rows.map((r) => ({ count: r.count, avg: r.waitP95.avg / 60, band: [r.waitP95.min / 60, r.waitP95.max / 60], pass: r.pass }));
  const maxRow = sum.rows[sum.rows.length - 1];

  let hero: ReactNode;
  if (!sum.complete) {
    hero = (
      <div>
        <div className="label">{t("sim_v2.sweep.recommended")}</div>
        <div className="big">–</div>
        <div className="label">{running ? t("sim_v2.sweep.running", { done: sweep.runs.length, total: sweep.total }) : t("sim_v2.sweep.incomplete", { done: sweep.runs.length, total: sweep.total })}</div>
      </div>
    );
  } else if (sum.recommended !== null && sum.minPass !== null) {
    const ratio = sum.minPass / s.availability;
    hero = (
      <>
        <div data-testid="simv2-sweep-recommended">
          <div className="label">{t("sim_v2.sweep.recommended")}</div>
          <div className="big">
            {sum.recommended}
            <small>{t("sim_v2.sweep.unit_vehicle")}</small>
          </div>
          <div className="label">{sweep.plan.typeName}</div>
        </div>
        <ul>
          <li>{t("sim_v2.sweep.explain_pass", { count: sum.minPass })}</li>
          <li>
            {t("sim_v2.sweep.explain_availability", {
              availability: fmtPercent(s.availability),
              count: sum.minPass,
              ratio: fmtNumber(ratio, 2),
              result: sum.recommended,
            })}
          </li>
          {sweep.plan.others > 0 && <li>{t("sim_v2.sweep.explain_others", { count: sweep.plan.others, total: sum.recommended + sweep.plan.others })}</li>}
          {sum.recommended > sweep.plan.counts[sweep.plan.counts.length - 1] && <li>{t("sim_v2.sweep.explain_beyond", { count: sum.recommended })}</li>}
          {sum.failAbove.length > 0 && <li style={{ color: "var(--c-danger)" }}>{t("sim_v2.sweep.explain_fail_above", { list: sum.failAbove.join("、") })}</li>}
        </ul>
      </>
    );
  } else {
    hero = (
      <>
        <div data-testid="simv2-sweep-recommended">
          <div className="label">{t("sim_v2.sweep.recommended")}</div>
          <div className="big" style={{ fontSize: 22 }}>
            {t("sim_v2.sweep.none")}
          </div>
        </div>
        <ul>
          <li>{t("sim_v2.sweep.none_detail", { max: maxRow?.count ?? s.max, fails: (maxRow?.fails ?? []).map(failLabel).join("、") || "–" })}</li>
          <li>{t("sim_v2.sweep.none_hint")}</li>
        </ul>
      </>
    );
  }

  return (
    <Wrap ref={wrapRef} data-testid="simv2-sweep-results">
      {stale && sweep.done && (
        <Alert
          type="warning"
          showIcon
          title={t("sim_v2.sweep.stale")}
          action={
            <Button size="small" onClick={() => startSweep(store)}>
              {t("sim_v2.sweep.rerun")}
            </Button>
          }
          data-testid="simv2-sweep-stale"
        />
      )}
      <Hero>
        {hero}
        <div style={{ marginLeft: "auto", alignSelf: "flex-start" }}>
          <Dropdown
            trigger={["click"]}
            disabled={!sweep.done}
            menu={{
              items: [
                { key: "xlsx", icon: <FileExcelOutlined />, label: t("sim_v2.report.excel") },
                { key: "print", icon: <PrinterOutlined />, label: t("sim_v2.report.print") },
              ],
              onClick: ({ key }) => (key === "xlsx" ? void exportReport.sweep(sweep) : setReportOpen(true)),
            }}
          >
            <Button size="small" loading={exportReport.busy} data-testid="simv2-sweep-report-menu">
              {t("sim_v2.report.button")} <DownOutlined />
            </Button>
          </Dropdown>
        </div>
      </Hero>
      <div style={{ fontSize: 12, color: "var(--c-text-secondary)" }}>
        {t("sim_v2.sweep.targets_line", {
          achievement: fmtPercent(s.minAchievement),
          wait: fmtNumber(s.maxWaitP95Min, 1),
          utilization: fmtPercent(s.maxUtilization),
        })}{" "}
        {t("sim_v2.sweep.seeds_line", { seeds: sweep.plan.seeds.join("、") })}
      </div>
      {sum.rows.length > 0 && (
        <Charts>
          <MetricChart
            title={t("sim_v2.sweep.chart_throughput")}
            unit={t("sim_v2.sweep.unit_per_hour")}
            data={throughput}
            width={chartWidth}
            color={color}
            refY={demand > 0 ? { value: demand, label: t("sim_v2.sweep.ref_demand", { value: fmtNumber(demand) }) } : null}
            refX={sum.minPass !== null ? { value: sum.minPass, label: t("sim_v2.sweep.ref_pass") } : null}
            format={(v) => fmtNumber(v)}
            onPick={pick}
            testId="simv2-sweep-chart-throughput"
          />
          <MetricChart
            title={t("sim_v2.sweep.chart_wait")}
            unit={t("sim_v2.unit.min")}
            data={wait}
            width={chartWidth}
            color={color}
            refY={{ value: s.maxWaitP95Min, label: t("sim_v2.sweep.ref_wait", { value: fmtNumber(s.maxWaitP95Min) }) }}
            refX={sum.minPass !== null ? { value: sum.minPass, label: t("sim_v2.sweep.ref_pass") } : null}
            format={(v) => fmtNumber(v)}
            onPick={pick}
            testId="simv2-sweep-chart-wait"
          />
        </Charts>
      )}
      <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: -6 }}>{t("sim_v2.sweep.chart_note")}</div>
      <Card>
        <h4>{t("sim_v2.sweep.table_title")}</h4>
        <Table<SweepRow>
          size="small"
          rowKey="count"
          dataSource={sum.rows}
          pagination={false}
          scroll={{ x: 760 }}
          data-testid="simv2-sweep-table"
          onRow={(r) => ({ onClick: () => pick(r.count), style: { cursor: "pointer" } })}
          rowClassName={(r) => (r.count === sum.minPass ? "simv2-sweep-pass-row" : "")}
          columns={[
            { title: t("sim_v2.sweep.col_count"), dataIndex: "count", width: 64, render: (c: number) => t("sim_v2.sweep.n_vehicles", { count: c }) },
            {
              title: t("sim_v2.sweep.col_throughput"),
              key: "tp",
              width: 140,
              align: "right",
              render: (_, r) => (
                <>
                  {fmtNumber(r.throughput.avg)}
                  <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                    {fmtNumber(r.throughput.min)} ~ {fmtNumber(r.throughput.max)}
                  </div>
                </>
              ),
            },
            { title: t("sim_v2.sweep.col_achievement"), key: "ach", width: 90, align: "right", render: (_, r) => fmtPercent(r.achievement.avg, 1) },
            {
              title: t("sim_v2.sweep.col_wait"),
              key: "wait",
              width: 110,
              align: "right",
              render: (_, r) => (
                <>
                  {fmtDuration(r.waitP95.avg)}
                  <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{t("sim_v2.sweep.worst", { value: fmtDuration(r.waitP95.max) })}</div>
                </>
              ),
            },
            { title: t("sim_v2.sweep.col_utilization"), key: "util", width: 80, align: "right", render: (_, r) => fmtPercent(r.utilization.avg) },
            { title: t("sim_v2.sweep.col_line_stop"), key: "ls", width: 90, align: "right", render: (_, r) => (r.lineStopMin.avg > 0.05 ? t("sim_v2.sweep.minutes", { value: fmtNumber(r.lineStopMin.avg) }) : "–") },
            {
              title: t("sim_v2.sweep.col_result"),
              key: "res",
              width: 150,
              render: (_, r) =>
                r.pass === null ? (
                  <span style={{ color: "var(--c-text-muted)" }}>{t("sim_v2.sweep.partial", { done: r.runs, total: sweep.plan.seeds.length })}</span>
                ) : r.pass ? (
                  <span style={{ color: "var(--c-success)" }}>
                    <CheckCircleFilled /> {t("sim_v2.sweep.pass")}
                  </span>
                ) : (
                  <span>
                    <span style={{ color: "var(--c-danger)" }}>
                      <CloseCircleFilled />
                    </span>{" "}
                    {FAIL_ORDER.filter((f) => r.fails.includes(f)).map((f) => (
                      <Tag key={f} style={{ marginInlineEnd: 4 }}>
                        {failLabel(f)}
                      </Tag>
                    ))}
                  </span>
                ),
            },
            {
              title: t("sim_v2.sweep.col_replay"),
              key: "replay",
              width: 130,
              render: (_, r) => (
                <span onClick={(e) => e.stopPropagation()}>
                  {sweep.plan.seeds.map((seed, i) => (
                    <AntTooltip key={seed} title={t("sim_v2.sweep.replay_seed", { seed })}>
                      <Button size="small" type="link" icon={i === 0 ? <PlayCircleOutlined /> : undefined} onClick={() => openSweepPick(store, r.count, seed)} style={{ padding: "0 4px" }}>
                        {i + 1}
                      </Button>
                    </AntTooltip>
                  ))}
                </span>
              ),
            },
          ]}
        />
        <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 8 }}>
          {sweep.done
            ? t("sim_v2.sweep.footer", { runs: sweep.runs.length, sec: fmtNumber(sweep.wallMs / 1000, 1) })
            : t("sim_v2.sweep.footer_partial", { runs: sweep.runs.length, total: sweep.total })}
          {sweep.savedAt && ` · ${t("sim_v2.history.saved_at", { time: new Date(sweep.savedAt).toLocaleString() })}`}
        </div>
      </Card>
    </Wrap>
  );
};

export default SweepResults;
