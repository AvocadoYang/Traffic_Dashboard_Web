import { FC, useMemo, useState } from "react";
import { Input, Select, Skeleton, Table, Tooltip, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAllMirMission, {
  MirMissionRobotStatus,
  MirMissionRow,
} from "@/api/useAllMirMission";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { c, font } from "../../ui/tokens";
import {
  PanelShell,
  Section,
  SectionTitle,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  EmptyState,
  TableWrap,
  CardFacts,
  Hint,
} from "../../ui/primitives";

dayjs.extend(relativeTime);

enum MissionPriority {
  TRIVIAL,
  NORMAL,
  PIVOTAL,
  CRITICAL,
}

type Selected = { amrId: string; missionName: string };

/**
 * 同步狀態同時要表達三件事:有沒有同步、能不能點、有沒有被選中。
 * 灰黑白之下用「外框 / 實心 / 虛線」三種樣式區分,不靠顏色。
 */
const StatusCell = styled.button<{ $synced: boolean; $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  font-family: ${font.mono};
  font-size: ${font.xs};
  letter-spacing: 0.5px;
  white-space: nowrap;
  transition: all 0.15s ease;

  border: 1px
    ${({ $synced }) => ($synced ? "solid" : "dashed")}
    ${({ $selected }) => ($selected ? c.accent : c.border)};
  background: ${({ $selected, $synced }) =>
    $selected ? c.accent : $synced ? c.bg : c.bgSubtle};
  color: ${({ $selected, $synced }) =>
    $selected ? "#ffffff" : $synced ? c.text : c.textMuted};
  cursor: ${({ $synced }) => ($synced ? "pointer" : "not-allowed")};

  &:hover:not(:disabled) {
    border-color: ${c.accent};
  }
`;

const MirMissionPanel: FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading, isFetching } = useAllMirMission();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [priority, setPriority] = useState<number>(MissionPriority.NORMAL);

  const queueMutation = useMutation({
    mutationFn: (payload: Selected) =>
      client.post("api/setting/queue-mir-task", {
        amrId: payload.amrId,
        missionName: payload.missionName,
        priority,
      }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: ["all-mir-mission"] });
      setSelected(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  /** 每台有同步紀錄的車各自成為一欄 */
  const robotNames = useMemo(() => {
    const names = new Set<string>();
    data?.forEach((row) => {
      Object.keys(row.robots).forEach((name) => names.add(name));
    });
    return [...names].sort();
  }, [data]);

  const rows = useMemo(() => {
    const all = data ?? [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter((r) => r.name.toLowerCase().includes(keyword));
  }, [data, search]);

  const statusCell = (
    robotName: string,
    row: MirMissionRow,
    status: MirMissionRobotStatus | null,
  ) => {
    if (!status) {
      return (
        <Tooltip title={t("main.mir_mission_panel.no_sync_tooltip")}>
          <StatusCell as="span" $synced={false} $selected={false}>
            <CloseCircleOutlined />
            {t("main.mir_mission_panel.missing")}
          </StatusCell>
        </Tooltip>
      );
    }

    const isSelected =
      selected?.amrId === robotName && selected?.missionName === row.name;

    return (
      <Tooltip title={`GUID: ${status.guid}`}>
        <StatusCell
          type="button"
          $synced
          $selected={isSelected}
          onClick={() =>
            setSelected({ amrId: robotName, missionName: row.name })
          }
        >
          <CheckCircleOutlined />
          {dayjs(status.synced_at).fromNow()}
        </StatusCell>
      </Tooltip>
    );
  };

  const columns: TableColumnsType<MirMissionRow> = useMemo(
    () => [
      {
        title: t("main.mir_mission_panel.name_column"),
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 220,
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      ...robotNames.map(
        (robotName): TableColumnsType<MirMissionRow>[number] => ({
          title: robotName,
          key: robotName,
          width: 160,
          filters: [
            { text: t("main.mir_mission_panel.synced"), value: "synced" },
            { text: t("main.mir_mission_panel.missing"), value: "missing" },
          ],
          onFilter: (value: React.Key | boolean, row: MirMissionRow) =>
            value === "synced"
              ? !!row.robots[robotName]
              : !row.robots[robotName],
          render: (_: unknown, row: MirMissionRow) =>
            statusCell(robotName, row, row.robots[robotName] ?? null),
        }),
      ),
    ],
    // statusCell 會用到 selected,所以這裡必須跟著重算
    [robotNames, selected, t],
  );

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ApartmentOutlined />
          {t("main.mir_mission_panel.title")}
        </SectionTitle>

        <Hint>{t("main.mir_mission_panel.select_hint")}</Hint>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("main.mir_mission_panel.name_column")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {rows.length === 0 ? (
          <EmptyState>NO MIR MISSIONS</EmptyState>
        ) : (
          <TableWrap>
            <Table<MirMissionRow>
              size="small"
              rowKey="name"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Section>
        <SectionTitle>
          <SendOutlined />
          {t("main.mir_mission_panel.queue_button")}
        </SectionTitle>

        <CardFacts>
          <dt>{t("main.mir_mission_panel.selected_amr")}</dt>
          <dd>{selected?.amrId ?? "—"}</dd>
          <dt>{t("main.mir_mission_panel.selected_mission")}</dt>
          <dd>{selected?.missionName ?? "—"}</dd>
        </CardFacts>

        <Field>
          <FieldLabel>{t("main.mir_mission_panel.priority")}</FieldLabel>
          <Select<number>
            value={priority}
            onChange={setPriority}
            style={{ width: "100%" }}
            options={[
              {
                value: MissionPriority.TRIVIAL,
                label: t("main.mission_modal.dialog_mission.priority.TRIVIAL"),
              },
              {
                value: MissionPriority.NORMAL,
                label: t("main.mission_modal.dialog_mission.priority.NORMAL"),
              },
              {
                value: MissionPriority.PIVOTAL,
                label: t("main.mission_modal.dialog_mission.priority.PIVOTAL"),
              },
              {
                value: MissionPriority.CRITICAL,
                label: t("main.mission_modal.dialog_mission.priority.CRITICAL"),
              },
            ]}
          />
        </Field>

        <Toolbar>
          <SolidButton
            disabled={!selected || queueMutation.isLoading}
            onClick={() => selected && queueMutation.mutate(selected)}
          >
            <SendOutlined />
            {queueMutation.isLoading
              ? t("main.mir_mission_panel.queue_button_loading")
              : t("main.mir_mission_panel.queue_button")}
          </SolidButton>
        </Toolbar>
      </Section>
    </PanelShell>
  );
};

export default MirMissionPanel;
