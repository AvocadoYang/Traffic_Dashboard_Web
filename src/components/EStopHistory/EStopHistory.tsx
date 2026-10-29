import { FC, ReactNode, useMemo, useState } from "react";
import { Button, DatePicker, Descriptions, Empty, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import ReactJsonView from "@uiw/react-json-view";
import dayjs, { Dayjs } from "dayjs";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import useEStopHistory, { EStopCommand, EStopRecord } from "@/api/useEStopHistory";
import { webglAvailable } from "@/components/Fleet3D/webgl";
import IncidentReplayModal from "./IncidentReplayModal";

const { Text } = Typography;

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-danger);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: "Roboto Mono", monospace;
  overflow: hidden;
`;

const Head = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--c-bg-subtle);
  border-bottom: 1px solid var(--c-border);
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--font-md);
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--c-text);

  .anticon {
    color: var(--c-danger);
  }
`;

const Scroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;

  .ant-table {
    background: transparent;
  }
  .ant-table-tbody > tr > td {
    font-size: 12px;
    vertical-align: top;
  }
`;

const Detail = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);

  pre {
    margin: 0;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--c-text-secondary);
  }
`;

const COMMAND_COLOR: Record<EStopCommand, string> = {
  PAUSE_IMMEDIATELY: "red",
  FINISH_CURRENT_ACTION_THEN_PAUSE: "orange",
  RESUME: "green",
};

const DetailBlock: FC<{ rec: EStopRecord }> = ({ rec }) => {
  const { t } = useTranslation();
  const yesNo = (v: boolean) => (v ? t("records.estop.yes") : t("records.estop.no"));
  const c = rec.context;
  const items: { key: string; label: string; children: ReactNode }[] = [
    { key: "by", label: t("records.estop.by"), children: rec.source.by },
    { key: "reason", label: t("records.estop.reason"), children: rec.source.reason ?? "-" },
  ];
  if (c) {
    items.push(
      { key: "mission", label: t("records.estop.mission"), children: c.missionId ? `${c.missionId} ${c.missionName ?? ""}` : t("records.estop.no_mission") },
      {
        key: "step",
        label: t("records.estop.step"),
        children:
          c.step === null
            ? "-"
            : `${c.step + 1} / ${c.stepCount ?? "?"} ${c.taskType ?? ""} @${c.taskLocationId ?? "-"}${
                c.taskLevel !== null && c.taskLevel >= 0 ? ` L${c.taskLevel + 1}` : ""
              }`,
      },
      { key: "carrier", label: t("records.estop.carrier"), children: c.carrierCount },
      { key: "was", label: t("records.estop.was_paused"), children: yesNo(c.wasPaused) },
      { key: "flag", label: t("records.estop.estop_flag"), children: yesNo(c.isEStopFlag) },
      { key: "maint", label: t("records.estop.maintenance"), children: c.maintenanceLevel ?? "-" },
      { key: "mock", label: t("records.estop.mock"), children: yesNo(c.mockCar) },
    );
  }
  return (
    <Detail>
      <Descriptions size="small" column={{ xs: 1, md: 2 }} items={items} />
      {rec.source.detail && Object.keys(rec.source.detail).length > 0 && (
        <div>
          <Text type="secondary">{t("records.estop.detail")}</Text>
          <ReactJsonView
            displayDataTypes={false}
            value={rec.source.detail}
            collapsed={1}
            enableClipboard={false}
            style={{ fontSize: 12, fontFamily: "Roboto Mono" }}
          />
        </div>
      )}
      {c?.machineState !== undefined && c?.machineState !== null && (
        <div>
          <Text type="secondary">{t("records.estop.machine_state")}</Text>
          <ReactJsonView
            displayDataTypes={false}
            value={c.machineState as object}
            collapsed={2}
            enableClipboard={false}
            style={{ fontSize: 12, fontFamily: "Roboto Mono" }}
          />
        </div>
      )}
      <div>
        <Text type="secondary">{t("records.estop.caller")}</Text>
        <pre>{rec.caller.length ? rec.caller.join("\n") : "-"}</pre>
      </div>
    </Detail>
  );
};

/**
 * emergency-stop 歷史: 誰送的、為什麼、送的當下車子在做什麼。點開一列看完整現場與呼叫堆疊。
 * 紀錄頁 (/records) 用完整版, 車輛詳情頁給 amrId + compact 只看那台車最近幾筆。
 */
const EStopHistory: FC<{ amrId?: string; compact?: boolean }> = ({ amrId, compact }) => {
  const { t } = useTranslation();
  const [date, setDate] = useState<Dayjs | null>(null);
  /** 打開「3D 回放」的那一筆 */
  const [replayOf, setReplayOf] = useState<EStopRecord | null>(null);
  const { data = [], isLoading } = useEStopHistory({
    amrId,
    date: date?.format("YYYY-MM-DD"),
    limit: compact ? 10 : 300,
  });

  const columns = useMemo<ColumnsType<EStopRecord>>(
    () => [
      {
        title: t("records.time"),
        dataIndex: "time",
        key: "time",
        width: 150,
        render: (v: string) => dayjs(v).format("MM-DD HH:mm:ss"),
      },
      ...(amrId
        ? []
        : [{ title: t("records.estop.amr"), dataIndex: "amrId", key: "amrId", width: 150 }]),
      {
        title: t("records.estop.command"),
        dataIndex: "command",
        key: "command",
        width: 150,
        render: (c: EStopCommand) => <Tag color={COMMAND_COLOR[c]}>{t(`records.estop.cmd.${c}` as never)}</Tag>,
      },
      {
        title: t("records.estop.by"),
        key: "by",
        render: (_: unknown, r) => (
          <div>
            <div>{r.source.by}</div>
            {r.source.reason && <Text type="secondary">{r.source.reason}</Text>}
          </div>
        ),
      },
      ...(compact
        ? []
        : [
            {
              title: t("records.estop.mission"),
              key: "mission",
              width: 150,
              render: (_: unknown, r: EStopRecord) => r.context?.missionId ?? "-",
            },
          ]),
      // 急停前後各台車怎麼走 (後端急停時存的現場)
      {
        title: "",
        key: "replay",
        width: 110,
        render: (_: unknown, r: EStopRecord) =>
          r.replayId ? (
            <Tooltip title={webglAvailable() ? t("fleet3d.incident.open_tip") : t("fleet3d.no_webgl")}>
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                disabled={!webglAvailable()}
                onClick={(e) => {
                  e.stopPropagation();
                  setReplayOf(r);
                }}
                data-testid="estop-replay"
              >
                {t("fleet3d.incident.open")}
              </Button>
            </Tooltip>
          ) : null,
      },
    ],
    [t, amrId, compact],
  );

  const body = (
    <Scroll>
      <Table<EStopRecord>
        size="small"
        rowKey="seq"
        loading={isLoading}
        columns={columns}
        dataSource={data}
        pagination={compact ? false : { pageSize: 20, showSizeChanger: false, size: "small" }}
        locale={{ emptyText: <Empty description={t("records.empty")} /> }}
        expandable={{ expandedRowRender: (r) => <DetailBlock rec={r} /> }}
      />
    </Scroll>
  );

  return (
    <Panel>
      <Head>
        <Title>
          <StopOutlined />
          {t("records.estop.title")}
        </Title>
        {!compact && (
          <DatePicker
            value={date}
            onChange={setDate}
            allowClear
            placeholder={t("records.estop.recent")}
          />
        )}
      </Head>
      {body}
      <IncidentReplayModal id={replayOf?.replayId ?? null} amrId={replayOf?.amrId} onClose={() => setReplayOf(null)} />
    </Panel>
  );
};

export default EStopHistory;
