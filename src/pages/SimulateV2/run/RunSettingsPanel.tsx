import { FC, ReactNode, useMemo } from "react";
import { Alert, Button, Progress, Segmented, Select, TimePicker, Tooltip } from "antd";
import { CaretRightOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { BlurNumber } from "../editor/fields";
import { updateRun, updateSweep } from "../model/setupOps";
import { Issue, validateDoc } from "../model/validate";
import { commitAtom, docAtom, showInLayoutAtom, workspaceTabAtom } from "../state/editorAtoms";
import { runErrorAtom, runModeAtom, runProgressAtom, saveErrorAtom, sweepErrorAtom, sweepProgressAtom } from "../state/runAtoms";
import { cancelRun, cancelSweep, startRun, startSweep } from "./controller";
import RunHistory from "./RunHistory";
import { planSweep, sweepDoc } from "./sweep";

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
  overflow-y: auto;
  background: var(--c-bg);
  border-right: 1px solid var(--c-border);
  font-size: 13px;
  color: var(--c-text);
`;

const Title = styled.div`
  font-weight: 600;
`;

const Rows = styled.div`
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--c-text-secondary);
`;

const Summary = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: var(--c-text-secondary);
  line-height: 1.8;
`;

const IssueItem = styled.li`
  margin-bottom: 6px;
  line-height: 1.5;

  button {
    padding: 0;
    height: auto;
  }
`;

const Range = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Help: FC<{ title: ReactNode; children: ReactNode }> = ({ title, children }) => (
  <Tooltip title={title}>
    <span style={{ textDecoration: "underline dotted", textUnderlineOffset: 3, cursor: "help" }}>{children}</span>
  </Tooltip>
);

/** 百分比輸入: 存 0 ~ 1, 畫面上是 % */
const Percent: FC<{ value: number; min: number; max: number; testId?: string; onCommit: (v: number) => void }> = ({ value, min, max, testId, onCommit }) => (
  <BlurNumber
    value={Math.round(value * 1000) / 10}
    min={min * 100}
    max={max * 100}
    step={1}
    precision={1}
    suffix="%"
    testId={testId}
    onCommit={(v) => v !== null && onCommit(v / 100)}
  />
);

const RunSettingsPanel: FC = () => {
  const { t } = useTranslation();
  const store = useStore();
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const [mode, setMode] = useAtom(runModeAtom);
  const progress = useAtomValue(runProgressAtom);
  const sweepProgress = useAtomValue(sweepProgressAtom);
  const error = useAtomValue(runErrorAtom);
  const sweepError = useAtomValue(sweepErrorAtom);
  const saveError = useAtomValue(saveErrorAtom);
  const showInLayout = useSetAtom(showInLayoutAtom);
  const setTab = useSetAtom(workspaceTabAtom);
  const sweep = doc.sweep;
  const plan = useMemo(() => planSweep(doc), [doc]);
  // 掃描: 用最多台的那一次來檢查 (待命點夠不夠)
  const issues = useMemo(
    () => (mode === "sweep" && plan ? validateDoc(sweepDoc(doc, plan.typeId, sweep.max, doc.run.seed)) : validateDoc(doc)),
    [doc, mode, plan, sweep.max],
  );
  const errors = issues.filter((x) => x.level === "error");
  const warnings = issues.filter((x) => x.level === "warning");
  const running = mode === "single" ? progress !== null : sweepProgress !== null;
  const run = doc.run;
  const vehicles = doc.vehicleTypes.reduce((s, x) => s + x.count, 0);
  const perHour = doc.demand.reduce((s, d) => s + (d.perHour > 0 ? d.perHour : 0), 0);
  const standby = doc.nodes.filter((n) => n.kind === "standby").length;
  const sweepRuns = plan ? plan.counts.length * plan.seeds.length : 0;

  const goFix = (x: Issue) => {
    if (x.nodeIds?.length || x.pathIds?.length) showInLayout({ nodeIds: x.nodeIds, pathIds: x.pathIds });
    else setTab(x.tab);
  };

  /** 待命點不夠掃到最多台: 可以直接把上限改成待命點夠的台數 */
  const maxByStandby = plan ? standby - plan.others : 0;

  return (
    <Panel data-testid="simv2-run-settings">
      <Segmented<"single" | "sweep">
        block
        value={mode}
        onChange={setMode}
        options={[
          { value: "single", label: t("sim_v2.run.mode_single") },
          { value: "sweep", label: t("sim_v2.run.mode_sweep") },
        ]}
        data-testid="simv2-run-mode"
      />
      <div>
        <Title style={{ marginBottom: 8 }}>{t("sim_v2.run.settings")}</Title>
        <Rows>
          <span>{t("sim_v2.run.duration")}</span>
          <BlurNumber
            value={run.durationH}
            min={0.1}
            max={168}
            step={1}
            precision={2}
            suffix={t("sim_v2.unit.hour")}
            testId="simv2-run-duration"
            onCommit={(v) => v !== null && commit((d) => updateRun(d, { durationH: v }))}
          />
          <Help title={t("sim_v2.run.warmup_help")}>{t("sim_v2.run.warmup")}</Help>
          <BlurNumber
            value={run.warmupMin}
            min={0}
            max={run.durationH * 60}
            step={5}
            precision={0}
            suffix={t("sim_v2.unit.min")}
            testId="simv2-run-warmup"
            onCommit={(v) => v !== null && commit((d) => updateRun(d, { warmupMin: v }))}
          />
          <Help title={t("sim_v2.run.start_help")}>{t("sim_v2.run.start")}</Help>
          <TimePicker
            size="small"
            format="HH:mm"
            minuteStep={5}
            allowClear={false}
            needConfirm={false}
            value={dayjs().hour(Number(run.startClock.slice(0, 2))).minute(Number(run.startClock.slice(3, 5)))}
            onChange={(v) => v && commit((d) => updateRun(d, { startClock: v.format("HH:mm") }))}
          />
          <Help title={mode === "sweep" ? t("sim_v2.sweep.seed_help") : t("sim_v2.run.seed_help")}>{t("sim_v2.run.seed")}</Help>
          <div style={{ display: "flex", gap: 4 }}>
            <BlurNumber
              value={run.seed}
              min={0}
              max={2 ** 31 - 1}
              step={1}
              precision={0}
              testId="simv2-run-seed"
              onCommit={(v) => v !== null && commit((d) => updateRun(d, { seed: v }))}
            />
            <Tooltip title={t("sim_v2.run.new_seed")}>
              <Button size="small" icon={<ReloadOutlined />} onClick={() => commit((d) => updateRun(d, { seed: Math.floor(Math.random() * 1e6) }))} />
            </Tooltip>
          </div>
        </Rows>
      </div>

      {mode === "sweep" && plan && (
        <div data-testid="simv2-sweep-settings">
          <Title style={{ marginBottom: 8 }}>{t("sim_v2.sweep.settings")}</Title>
          <Rows>
            {doc.vehicleTypes.length > 1 && (
              <>
                <span>{t("sim_v2.sweep.type")}</span>
                <Select
                  size="small"
                  value={plan.typeId}
                  options={doc.vehicleTypes.map((x) => ({ value: x.id, label: x.name }))}
                  onChange={(v) => commit((d) => updateSweep(d, { typeId: v }))}
                />
              </>
            )}
            <Help title={t("sim_v2.sweep.range_help")}>{t("sim_v2.sweep.range")}</Help>
            <Range>
              <BlurNumber value={sweep.min} min={1} max={200} precision={0} testId="simv2-sweep-min" onCommit={(v) => v !== null && commit((d) => updateSweep(d, { min: v }))} />
              <span>~</span>
              <BlurNumber value={sweep.max} min={1} max={200} precision={0} testId="simv2-sweep-max" onCommit={(v) => v !== null && commit((d) => updateSweep(d, { max: v }))} />
            </Range>
            <Help title={t("sim_v2.sweep.seeds_help")}>{t("sim_v2.sweep.seeds")}</Help>
            <BlurNumber value={sweep.seeds} min={1} max={10} precision={0} suffix={t("sim_v2.sweep.seeds_unit")} testId="simv2-sweep-seeds" onCommit={(v) => v !== null && commit((d) => updateSweep(d, { seeds: v }))} />
          </Rows>
          <Title style={{ margin: "12px 0 8px", fontWeight: 500 }}>{t("sim_v2.sweep.targets")}</Title>
          <Rows>
            <span>{t("sim_v2.sweep.min_achievement")}</span>
            <Percent value={sweep.minAchievement} min={0.5} max={1} testId="simv2-sweep-achievement" onCommit={(v) => commit((d) => updateSweep(d, { minAchievement: v }))} />
            <span>{t("sim_v2.sweep.max_wait")}</span>
            <BlurNumber
              value={sweep.maxWaitP95Min}
              min={0}
              max={600}
              step={1}
              precision={1}
              suffix={t("sim_v2.unit.min")}
              testId="simv2-sweep-wait"
              onCommit={(v) => v !== null && commit((d) => updateSweep(d, { maxWaitP95Min: v }))}
            />
            <span>{t("sim_v2.sweep.max_utilization")}</span>
            <Percent value={sweep.maxUtilization} min={0.1} max={1} testId="simv2-sweep-utilization" onCommit={(v) => commit((d) => updateSweep(d, { maxUtilization: v }))} />
            <Help title={t("sim_v2.sweep.availability_help")}>{t("sim_v2.sweep.availability")}</Help>
            <Percent value={sweep.availability} min={0.3} max={1} testId="simv2-sweep-availability" onCommit={(v) => commit((d) => updateSweep(d, { availability: v }))} />
          </Rows>
        </div>
      )}

      <Summary data-testid="simv2-run-summary">
        {mode === "sweep" && plan ? (
          <li>
            {t("sim_v2.sweep.summary", { type: plan.typeName, min: sweep.min, max: sweep.max, runs: sweepRuns })}
            {plan.others > 0 && <div>{t("sim_v2.sweep.summary_others", { count: plan.others })}</div>}
          </li>
        ) : (
          <li>{t("sim_v2.run.summary_vehicles", { count: vehicles, types: doc.vehicleTypes.length })}</li>
        )}
        <li>{t("sim_v2.run.summary_demand", { rows: doc.demand.length, perHour: Math.round(perHour * 10) / 10 })}</li>
        <li>{t("sim_v2.run.summary_layout", { nodes: doc.nodes.length, paths: doc.paths.length })}</li>
      </Summary>

      {running ? (
        <div>
          <Progress
            percent={Math.round((mode === "single" ? progress ?? 0 : sweepProgress ?? 0) * 100)}
            size="small"
            status="active"
            data-testid={mode === "single" ? "simv2-run-progress" : "simv2-sweep-progress"}
          />
          <Button
            block
            icon={<StopOutlined />}
            onClick={() => (mode === "single" ? cancelRun(store) : cancelSweep(store))}
            data-testid={mode === "single" ? "simv2-run-cancel" : "simv2-sweep-cancel"}
          >
            {t("sim_v2.run.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          type="primary"
          block
          icon={<CaretRightOutlined />}
          disabled={errors.length > 0 || (mode === "sweep" && !plan)}
          onClick={() => (mode === "single" ? startRun(store) : startSweep(store))}
          data-testid={mode === "single" ? "simv2-run-start" : "simv2-sweep-start"}
        >
          {mode === "single" ? t("sim_v2.run.start_run") : t("sim_v2.sweep.start", { runs: sweepRuns })}
        </Button>
      )}
      {mode === "single" && error && <Alert type="error" showIcon title={t("sim_v2.run.failed")} description={error} />}
      {mode === "sweep" && sweepError && <Alert type="error" showIcon title={t("sim_v2.run.failed")} description={sweepError} />}
      {saveError && <Alert type="warning" showIcon title={t("sim_v2.history.save_failed")} description={saveError} />}

      {issues.length > 0 && (
        <div data-testid="simv2-run-checks">
          <Title style={{ marginBottom: 6 }}>{errors.length ? t("sim_v2.run.checks_errors", { count: errors.length }) : t("sim_v2.run.checks_warnings")}</Title>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {[...errors, ...warnings].map((x, i) => (
              <IssueItem key={i} style={{ color: x.level === "error" ? "var(--c-danger)" : "var(--c-text-secondary)" }} data-level={x.level}>
                {t(`sim_v2.check.${x.code}`, x.params)}{" "}
                <Button type="link" size="small" onClick={() => goFix(x)}>
                  {t(x.nodeIds?.length || x.pathIds?.length ? "sim_v2.run.show" : `sim_v2.run.go_${x.tab}`)}
                </Button>
                {mode === "sweep" && x.code === "too_few_standby" && maxByStandby >= sweep.min && (
                  <>
                    {" · "}
                    <Button type="link" size="small" onClick={() => commit((d) => updateSweep(d, { max: maxByStandby }))} data-testid="simv2-sweep-fix-max">
                      {t("sim_v2.sweep.fix_max", { count: maxByStandby })}
                    </Button>
                  </>
                )}
              </IssueItem>
            ))}
          </ul>
        </div>
      )}

      <RunHistory kind={mode} />
    </Panel>
  );
};

export default RunSettingsPanel;
