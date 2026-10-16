import { FC, useMemo } from "react";
import { Alert, Button, Progress, TimePicker, Tooltip } from "antd";
import { CaretRightOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { BlurNumber } from "../editor/fields";
import { updateRun } from "../model/setupOps";
import { validateDoc } from "../model/validate";
import { commitAtom, docAtom, showInLayoutAtom, workspaceTabAtom } from "../state/editorAtoms";
import { runErrorAtom, runProgressAtom } from "../state/runAtoms";
import { cancelRun, startRun } from "./controller";

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

const RunSettingsPanel: FC = () => {
  const { t } = useTranslation();
  const store = useStore();
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const progress = useAtomValue(runProgressAtom);
  const error = useAtomValue(runErrorAtom);
  const showInLayout = useSetAtom(showInLayoutAtom);
  const setTab = useSetAtom(workspaceTabAtom);
  const issues = useMemo(() => validateDoc(doc), [doc]);
  const errors = issues.filter((x) => x.level === "error");
  const warnings = issues.filter((x) => x.level === "warning");
  const running = progress !== null;
  const run = doc.run;
  const vehicles = doc.vehicleTypes.reduce((s, x) => s + x.count, 0);
  const perHour = doc.demand.reduce((s, d) => s + (d.perHour > 0 ? d.perHour : 0), 0);

  const goFix = (x: (typeof issues)[number]) => {
    if (x.nodeIds?.length || x.pathIds?.length) showInLayout({ nodeIds: x.nodeIds, pathIds: x.pathIds });
    else setTab(x.tab);
  };

  return (
    <Panel data-testid="simv2-run-settings">
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
          <Tooltip title={t("sim_v2.run.warmup_help")}>
            <span>{t("sim_v2.run.warmup")}</span>
          </Tooltip>
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
          <Tooltip title={t("sim_v2.run.start_help")}>
            <span>{t("sim_v2.run.start")}</span>
          </Tooltip>
          <TimePicker
            size="small"
            format="HH:mm"
            minuteStep={5}
            allowClear={false}
            needConfirm={false}
            value={dayjs().hour(Number(run.startClock.slice(0, 2))).minute(Number(run.startClock.slice(3, 5)))}
            onChange={(v) => v && commit((d) => updateRun(d, { startClock: v.format("HH:mm") }))}
          />
          <Tooltip title={t("sim_v2.run.seed_help")}>
            <span>{t("sim_v2.run.seed")}</span>
          </Tooltip>
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
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => commit((d) => updateRun(d, { seed: Math.floor(Math.random() * 1e6) }))}
              />
            </Tooltip>
          </div>
        </Rows>
      </div>

      <Summary data-testid="simv2-run-summary">
        <li>{t("sim_v2.run.summary_vehicles", { count: vehicles, types: doc.vehicleTypes.length })}</li>
        <li>{t("sim_v2.run.summary_demand", { rows: doc.demand.length, perHour: Math.round(perHour * 10) / 10 })}</li>
        <li>{t("sim_v2.run.summary_layout", { nodes: doc.nodes.length, paths: doc.paths.length })}</li>
      </Summary>

      {running ? (
        <div>
          <Progress percent={Math.round(progress * 100)} size="small" status="active" data-testid="simv2-run-progress" />
          <Button block icon={<StopOutlined />} onClick={() => cancelRun(store)} data-testid="simv2-run-cancel">
            {t("sim_v2.run.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          type="primary"
          block
          icon={<CaretRightOutlined />}
          disabled={errors.length > 0}
          onClick={() => startRun(store)}
          data-testid="simv2-run-start"
        >
          {t("sim_v2.run.start_run")}
        </Button>
      )}
      {error && <Alert type="error" showIcon title={t("sim_v2.run.failed")} description={error} />}

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
              </IssueItem>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};

export default RunSettingsPanel;
