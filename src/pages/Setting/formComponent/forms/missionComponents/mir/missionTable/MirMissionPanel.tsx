import useAllMirMission, {
  MirMissionRobotStatus,
  MirMissionRow,
} from "@/api/useAllMirMission";
import FormHr from "@/pages/Setting/utils/FormHr";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { CheckCircleFilled, CloseCircleFilled, SendOutlined } from "@ant-design/icons";
import { Select, Table, TableColumnsType, Tag, Tooltip, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

dayjs.extend(relativeTime);

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%; /* 或用 calc(100vh - xxx) 依你的 layout 而定 */
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 6px 8px;
  margin: 0 0 20px 0;
  font-family: "Roboto Mono", monospace;
  color: #262626;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px;
  cursor: move;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f5ff;
    border-left-color: #40a9ff;
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 0 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FieldLabel = styled.div`
  color: #595959;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
`;

const SelectableTag = styled(Tag)<{ $selectable: boolean; $selected: boolean }>`
  cursor: ${({ $selectable }) => ($selectable ? "pointer" : "not-allowed")};
  transition: all 0.15s ease;

  ${({ $selected }) =>
    $selected &&
    `
      outline: 2px solid #1890ff;
      outline-offset: 1px;
      font-weight: 700;
    `}

  &:hover {
    ${({ $selectable }) => $selectable && "filter: brightness(1.05);"}
  }
`;

const SummaryBar = styled.div`
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  padding: 10px 12px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #595959;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;

  span:first-child {
    color: #8c8c8c;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 10px;
  }
`;

const QueueButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 11px;
  border: 1px solid #1890ff;
  border-radius: 4px;
  background: #1890ff;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #40a9ff;
    border-color: #40a9ff;
  }

  &:disabled {
    background: #f5f5f5;
    border-color: #d9d9d9;
    color: #bfbfbf;
    cursor: not-allowed;
  }
`;

type Selected = { amrId: string; missionName: string };

enum MissionPriority {
  TRIVIAL,
  NORMAL,
  PIVOTAL,
  CRITICAL,
}

const RobotStatusCell: FC<{
  status: MirMissionRobotStatus | null;
  selected: boolean;
  onSelect: () => void;
}> = ({ status, selected, onSelect }) => {
  const { t } = useTranslation();

  if (!status) {
    return (
      <Tooltip title={t("main.mir_mission_panel.no_sync_tooltip")}>
        <SelectableTag
          icon={<CloseCircleFilled />}
          color="error"
          $selectable={false}
          $selected={false}
        >
          {t("main.mir_mission_panel.missing")}
        </SelectableTag>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`GUID: ${status.guid}`}>
      <SelectableTag
        icon={<CheckCircleFilled />}
        color="success"
        $selectable
        $selected={selected}
        onClick={onSelect}
      >
        {dayjs(status.synced_at).fromNow()}
      </SelectableTag>
    </Tooltip>
  );
};

const MirMissionPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useAllMirMission();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [priority, setPriority] = useState<number>(MissionPriority.NORMAL);

  const queueMutation = useMutation({
    mutationFn: (payload: Selected) => {
      return client.post("api/setting/queue-mir-task", {
        amrId: payload.amrId,
        missionName: payload.missionName,
        priority,
      });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: ["all-mir-mission"] });
      setSelected(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const robotNames = useMemo(() => {
    const names = new Set<string>();
    data?.forEach((row) => {
      Object.keys(row.robots).forEach((name) => names.add(name));
    });
    return [...names].sort();
  }, [data]);

  const columns: TableColumnsType<MirMissionRow> = useMemo(
    () => [
      {
        title: t("main.mir_mission_panel.name_column"),
        dataIndex: "name",
        key: "name",
        fixed: "left",
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      ...robotNames.map(
        (robotName): TableColumnsType<MirMissionRow>[number] => ({
          title: robotName,
          dataIndex: ["robots", robotName],
          key: robotName,
          filters: [
            { text: t("main.mir_mission_panel.synced"), value: "synced" },
            { text: t("main.mir_mission_panel.missing"), value: "missing" },
          ],
          onFilter: (value: React.Key | boolean, row: MirMissionRow) =>
            value === "synced"
              ? !!row.robots[robotName]
              : !row.robots[robotName],
          render: (_: unknown, row) => (
            <RobotStatusCell
              status={row.robots[robotName] ?? null}
              selected={
                selected?.amrId === robotName &&
                selected?.missionName === row.name
              }
              onSelect={() =>
                setSelected({ amrId: robotName, missionName: row.name })
              }
            />
          ),
        }),
      ),
    ],
    [robotNames, selected, t],
  );

  return (
    <IndustrialContainer>
      {contextHolder}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: "100%",
        }}
      >
        <PanelHeader {...listeners} {...attributes}>
          {t("main.mir_mission_panel.title")}
        </PanelHeader>
        <FormHr />

        <Body>
          <FieldLabel>{t("main.mir_mission_panel.select_hint")}</FieldLabel>

          <Table<MirMissionRow>
            rowKey="name"
            size="small"
            loading={isLoading}
            columns={columns}
            dataSource={data}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, size: "small" }}
          />

          <SummaryBar>
            <SummaryRow>
              <span>{t("main.mir_mission_panel.selected_amr")}</span>
              <span>{selected?.amrId ?? "—"}</span>
            </SummaryRow>
            <SummaryRow>
              <span>{t("main.mir_mission_panel.selected_mission")}</span>
              <span>{selected?.missionName ?? "—"}</span>
            </SummaryRow>
            <SummaryRow>
              <span>{t("main.mir_mission_panel.priority")}</span>
              <Select<number>
                size="small"
                value={priority}
                onChange={setPriority}
                style={{ minWidth: 120 }}
                options={[
                  {
                    value: MissionPriority.TRIVIAL,
                    label: t(
                      "main.mission_modal.dialog_mission.priority.TRIVIAL",
                    ),
                  },
                  {
                    value: MissionPriority.NORMAL,
                    label: t(
                      "main.mission_modal.dialog_mission.priority.NORMAL",
                    ),
                  },
                  {
                    value: MissionPriority.PIVOTAL,
                    label: t(
                      "main.mission_modal.dialog_mission.priority.PIVOTAL",
                    ),
                  },
                  {
                    value: MissionPriority.CRITICAL,
                    label: t(
                      "main.mission_modal.dialog_mission.priority.CRITICAL",
                    ),
                  },
                ]}
              />
            </SummaryRow>
          </SummaryBar>

          <QueueButton
            disabled={!selected || queueMutation.isPending}
            onClick={() => selected && queueMutation.mutate(selected)}
          >
            <SendOutlined />
            {queueMutation.isPending
              ? t("main.mir_mission_panel.queue_button_loading")
              : t("main.mir_mission_panel.queue_button")}
          </QueueButton>
        </Body>
      </div>
    </IndustrialContainer>
  );
};

export default MirMissionPanel;
