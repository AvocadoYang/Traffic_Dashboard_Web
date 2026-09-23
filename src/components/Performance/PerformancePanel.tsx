import { FC } from "react";
import { useAtom } from "jotai";
import { Alert, Card, Flex, Progress, Select, Table, Tag, Tooltip } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import usePerformance, { AmrBusy } from "@/api/usePerformance";
import { OpenPerformancePanel, PerformanceWindowMin } from "@/utils/gloable";

const PanelWrap = styled.div<{ $top: string; $right: string }>`
  position: absolute;
  z-index: 6;
  top: ${({ $top }) => $top};
  right: ${({ $right }) => $right};
  width: 340px;
  max-height: calc(100vh - 16em);
  overflow: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  border-radius: 8px;
`;

const Num = styled.div<{ $tone?: "ok" | "warn" | "bad" }>`
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  color: ${({ $tone }) =>
    $tone === "bad" ? "#cf1322" : $tone === "warn" ? "#d46b08" : "inherit"};
`;

const Label = styled.div`
  font-size: 12px;
  color: #888;
`;

const Stat: FC<{
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
  hint?: string;
}> = ({ label, value, tone, hint }) => (
  <Tooltip title={hint}>
    <div style={{ minWidth: 92 }}>
      <Label>{label}</Label>
      <Num $tone={tone}>{value}</Num>
    </div>
  </Tooltip>
);

/**
 * 模擬跑到一半時的效能即時狀態。
 *
 * 回答兩個不同的問題, 因為處置完全不同:
 *   車隊跟不跟得上 -> 佇列深度 / 等待時間 / 忙碌率  -> 要加車
 *   程式卡不卡     -> event loop 延遲                -> 要修程式
 */
const PerformancePanel: FC<{ top?: string; right?: string }> = ({
  top = "6em",
  right = "20px",
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useAtom(OpenPerformancePanel);
  const [windowMin, setWindowMin] = useAtom(PerformanceWindowMin);
  const { data } = usePerformance(windowMin, isOpen);

  if (!isOpen) return null;

  const fleet = data?.fleet;
  const proc = data?.process;

  const ratioTone =
    fleet?.queueRatio == null
      ? undefined
      : fleet.queueRatio > 3
        ? "bad"
        : fleet.queueRatio > 1
          ? "warn"
          : "ok";

  const lagTone =
    proc?.health === "critical" ? "bad" : proc?.health === "warn" ? "warn" : "ok";

  const verdictType =
    fleet?.verdict.level === "saturated"
      ? "error"
      : fleet?.verdict.level === "busy"
        ? "warning"
        : "success";

  return (
    <PanelWrap $top={top} $right={right}>
      <Card
        size="small"
        title={
          <Flex gap={6} align="center">
            {t("sim.perf.title")}
            {data && (
              <Tag
                color={data.scope === "simulated" ? "purple" : "green"}
                style={{ marginInlineEnd: 0 }}
              >
                {t(`sim.perf.scope_${data.scope}`)}
              </Tag>
            )}
          </Flex>
        }
        extra={
          <Flex gap={6} align="center">
            <Select
              size="small"
              value={windowMin}
              onChange={setWindowMin}
              style={{ width: 84 }}
              options={[5, 10, 30, 60].map((m) => ({
                label: t("sim.perf.last_min", { count: m }),
                value: m,
              }))}
            />
            <CloseOutlined onClick={() => setIsOpen(false)} />
          </Flex>
        }
      >
        <Flex vertical gap={12}>
          {fleet && (
            <Alert
              type={verdictType}
              showIcon
              message={t(`sim.perf.verdict_${fleet.verdict.level}`)}
              description={
                <span style={{ fontSize: 12 }}>{fleet.verdict.reason}</span>
              }
            />
          )}

          <Flex gap={8} wrap>
            <Stat
              label={t("sim.perf.pending")}
              value={`${fleet?.pending ?? "—"}`}
              tone={(fleet?.pending ?? 0) > 0 ? "warn" : "ok"}
              hint={t("sim.perf.pending_hint")}
            />
            <Stat
              label={t("sim.perf.executing")}
              value={`${fleet?.executing ?? "—"}`}
            />
            <Stat
              label={t("sim.perf.queue_ratio")}
              value={fleet?.queueRatio != null ? `${fleet.queueRatio}x` : "—"}
              tone={ratioTone}
              hint={t("sim.perf.queue_ratio_hint")}
            />
          </Flex>

          <Flex gap={8} wrap>
            <Stat
              label={t("sim.perf.avg_wait")}
              value={fleet?.avgWaitSec != null ? `${fleet.avgWaitSec}s` : "—"}
              hint={
                fleet?.stillWaiting
                  ? t("sim.perf.wait_includes_queued", {
                      count: fleet.stillWaiting,
                    })
                  : undefined
              }
            />
            <Stat
              label={t("sim.perf.p95_wait")}
              value={fleet?.p95WaitSec != null ? `${fleet.p95WaitSec}s` : "—"}
              hint={t("sim.perf.p95_hint")}
            />
            <Stat
              label={t("sim.perf.avg_run")}
              value={fleet?.avgRunSec != null ? `${fleet.avgRunSec}s` : "—"}
            />
          </Flex>

          <div>
            <Label>
              {t("sim.perf.fleet_busy", {
                percent: fleet?.fleetBusyWhileActive ?? 0,
              })}
            </Label>
            <Progress
              percent={fleet?.fleetBusyWhileActive ?? 0}
              size="small"
              status={
                (fleet?.fleetBusyWhileActive ?? 0) > 90 ? "exception" : "normal"
              }
            />
          </div>

          {!!fleet?.amrs.length && (
            <Table
              size="small"
              rowKey="amrId"
              dataSource={fleet.amrs}
              pagination={false}
              columns={[
                { title: t("sim.perf.amr"), dataIndex: "amrId", ellipsis: true },
                {
                  title: t("sim.perf.busy"),
                  width: 72,
                  render: (_: unknown, r: AmrBusy) => (
                    <Tag color={r.busyPercentWhileActive > 90 ? "red" : "blue"}>
                      {r.busyPercentWhileActive}%
                    </Tag>
                  ),
                },
              ]}
            />
          )}

          {!!fleet?.staleMissions && (
            <Alert
              type="warning"
              showIcon
              message={t("sim.perf.stale", { count: fleet.staleMissions })}
              description={
                <span style={{ fontSize: 12 }}>{t("sim.perf.stale_hint")}</span>
              }
            />
          )}

          <Flex gap={8} wrap style={{ borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
            <Stat
              label={t("sim.perf.event_loop")}
              value={
                proc ? `${proc.eventLoopLag.p99}ms` : "—"
              }
              tone={lagTone}
              hint={t("sim.perf.event_loop_hint")}
            />
            <Stat
              label={t("sim.perf.heap")}
              value={proc ? `${proc.memory.heapUsedMb}MB` : "—"}
            />
            <Stat
              label={t("sim.perf.lag_max")}
              value={proc ? `${proc.eventLoopLag.max}ms` : "—"}
              hint={t("sim.perf.lag_max_hint")}
            />
          </Flex>
        </Flex>
      </Card>
    </PanelWrap>
  );
};

export default PerformancePanel;
