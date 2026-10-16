/** 結果紀錄的列表 (左邊設定欄的最下面): 點一下打開, 可以刪除; 跟目前設定不一樣的標「舊設定」 */
import { FC, useMemo, useState } from "react";
import { App, Button, Popconfirm, Spin, Tag, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAtomValue, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { RunMeta, apiErrorOf, useRuns } from "../api/simV2Api";
import { docAtom, projectAtom } from "../state/editorAtoms";
import { runOutcomeAtom, sweepOutcomeAtom } from "../state/runAtoms";
import { deleteSavedRun, openSavedRun } from "./controller";
import { fmtNumber, fmtPercent } from "./format";
import { RunBrief, briefOf } from "./history";
import { runHash, sweepHash } from "./sweep";

const Title = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: 600;

  small {
    font-weight: 400;
    color: var(--c-text-muted);
  }
`;

const Row = styled.div<{ $active: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  padding: 6px 6px 6px 8px;
  margin-bottom: 4px;
  border: 1px solid ${(p) => (p.$active ? "var(--c-accent)" : "var(--c-border)")};
  border-radius: 6px;
  background: ${(p) => (p.$active ? "var(--c-bg-subtle)" : "transparent")};
  cursor: pointer;

  &:hover {
    background: var(--c-bg-muted);
  }
  .when {
    font-size: 12px;
    color: var(--c-text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .what {
    line-height: 1.5;
  }
  .ant-tag {
    margin-inline-end: 0;
    margin-left: 4px;
  }
`;

/** 一次最多列幾筆 (後端留 50 筆) */
const PAGE = 8;

const RunHistory: FC<{ kind: "single" | "sweep" }> = ({ kind }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const store = useStore();
  const project = useAtomValue(projectAtom);
  const doc = useAtomValue(docAtom);
  const single = useAtomValue(runOutcomeAtom);
  const sweep = useAtomValue(sweepOutcomeAtom);
  const runs = useRuns(project?.id);
  const [opening, setOpening] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const current = useMemo(() => (kind === "single" ? runHash(doc) : sweepHash(doc)), [doc, kind]);
  const shownId = kind === "single" ? single?.runId : sweep?.runId;
  const list = (runs.data ?? []).filter((r) => r.kind === kind);
  if (!project) return null;

  const open = async (r: RunMeta) => {
    setOpening(r.id);
    try {
      await openSavedRun(store, project.id, r);
    } catch (err) {
      message.error(t("sim_v2.history.open_failed", { reason: apiErrorOf(err).message }));
    } finally {
      setOpening(null);
    }
  };

  const remove = async (r: RunMeta) => {
    try {
      await deleteSavedRun(store, project.id, r.id);
    } catch (err) {
      message.error(apiErrorOf(err).message);
    }
  };

  const describe = (b: RunBrief | null) => {
    if (!b) return t("sim_v2.history.unknown");
    if (b.kind === "single") {
      return (
        <>
          {t("sim_v2.history.single_line", { vehicles: b.vehicles, throughput: fmtNumber(b.throughput), achievement: fmtPercent(b.achievement) })}
          {b.deadlock && <Tag color="error">{t("sim_v2.history.deadlock")}</Tag>}
        </>
      );
    }
    if (!b.complete) return t("sim_v2.history.sweep_partial", { type: b.typeName, min: b.min, max: b.max });
    return b.recommended !== null
      ? t("sim_v2.history.sweep_line", { type: b.typeName, min: b.min, max: b.max, count: b.recommended })
      : t("sim_v2.history.sweep_none", { type: b.typeName, min: b.min, max: b.max });
  };

  const shown = more ? list : list.slice(0, PAGE);
  return (
    <div data-testid="simv2-history">
      <Title>
        <span>{t("sim_v2.history.title")}</span>
        <small>{runs.isLoading ? <Spin size="small" /> : t("sim_v2.history.count", { count: list.length })}</small>
      </Title>
      {!list.length && !runs.isLoading && <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{t(`sim_v2.history.empty_${kind}`)}</div>}
      {shown.map((r) => {
        const b = briefOf(r.summary);
        const stale = !!b && b.hash !== current;
        return (
          <Row key={r.id} $active={r.id === shownId} onClick={() => void open(r)} data-testid="simv2-history-row">
            <div>
              <div className="when">
                {dayjs(r.created_at).format("MM/DD HH:mm")}
                {stale && (
                  <Tooltip title={t("sim_v2.history.stale_help")}>
                    <Tag>{t("sim_v2.history.stale")}</Tag>
                  </Tooltip>
                )}
              </div>
              <div className="what">{describe(b)}</div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {opening === r.id ? (
                <Spin size="small" />
              ) : (
                <Popconfirm title={t("sim_v2.history.delete_confirm")} onConfirm={() => void remove(r)}>
                  <Button size="small" type="text" icon={<DeleteOutlined />} aria-label={t("sim_v2.history.delete")} />
                </Popconfirm>
              )}
            </div>
          </Row>
        );
      })}
      {list.length > PAGE && (
        <Button type="link" size="small" onClick={() => setMore(!more)} style={{ padding: 0 }}>
          {more ? t("sim_v2.history.less") : t("sim_v2.history.more", { count: list.length - PAGE })}
        </Button>
      )}
    </div>
  );
};

export default RunHistory;
