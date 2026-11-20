import { Input, Modal, Table } from "antd";
import { useMemo, useState } from "react";
import { SearchOutlined, DatabaseOutlined } from "@ant-design/icons";
import styled from "styled-components";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTranslation } from "react-i18next";
import useAllMirMission, { MirMissionRow } from "@/api/useAllMirMission";

dayjs.extend(relativeTime);

// Industrial Modal Styling — mirrors MissionTableSelect.tsx so both
// "select a mission" flows (regular AGVC missions vs. MiR-native missions)
// look and behave identically.
const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: var(--c-bg);
    border: 2px solid var(--c-header-border);
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: var(--c-bg-subtle);
    border-bottom: 2px solid var(--c-header-border);
    padding: 16px 24px;
    position: relative;
    border-radius: 0;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--c-header-accent);
    }
  }

  .ant-modal-title {
    font-family: "Roboto Mono", monospace;
    font-size: 16px;
    font-weight: 700;
    color: var(--c-header-accent);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ant-modal-body {
    padding: 24px;
    background: var(--c-bg);
  }
`;

const IndustrialButton = styled.button`
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  color: var(--c-text);
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 44px;
  font-weight: 600;
  border-radius: 0;
  width: 100%;
  text-align: left;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 12px;
  cursor: pointer;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: var(--c-header-accent);
    transition: width 0.2s;
  }

  &:hover:not(:disabled) {
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);

    &::before {
      width: 4px;
    }
  }

  &.selected {
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
    box-shadow: inset 0 0 20px rgba(24, 144, 255, 0.08);

    &::before {
      width: 4px;
    }
  }

  &:disabled {
    background: var(--c-bg-subtle);
    border-color: var(--c-header-border);
    color: var(--c-text-muted);
    cursor: not-allowed;
  }
`;

const SearchContainer = styled.div`
  margin-bottom: 16px;
  position: relative;
`;

const IndustrialInput = styled(Input)`
  border-radius: 0;
  border: 1px solid var(--c-header-border);
  font-family: "Roboto Mono", monospace;
  height: 44px;
  background: var(--c-bg-subtle);

  &:hover {
    border-color: var(--c-header-accent);
    background: var(--c-bg);
  }

  &:focus,
  &.ant-input-focused {
    border-color: var(--c-header-accent);
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    background: var(--c-bg);
  }

  .ant-input-prefix {
    color: var(--c-header-accent);
  }
`;

const IndustrialTable = styled(Table)`
  .ant-table {
    border: 1px solid var(--c-header-border);
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: var(--c-bg-subtle);
    border-bottom: 2px solid var(--c-header-border);
    color: var(--c-text-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    padding: 12px 16px;
    border-radius: 0;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--c-header-accent-soft);

      td {
        background: transparent;
      }
    }

    &.ant-table-row-selected {
      background: var(--c-header-accent-soft);

      td {
        background: transparent;
      }
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid var(--c-bg-muted);
    padding: 12px 16px;
    font-size: 12px;
  }

  .ant-table-pagination {
    margin: 16px 0 0 0;
  }

  .ant-pagination-item {
    border: 1px solid var(--c-header-border);
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
    background: var(--c-bg-subtle);

    &:hover {
      border-color: var(--c-header-accent);
      background: var(--c-header-accent-soft);
    }

    &.ant-pagination-item-active {
      border-color: var(--c-header-accent);
      background: var(--c-header-accent);

      a {
        color: #ffffff;
      }
    }
  }
`;

const MissionName = styled.div`
  font-weight: 600;
  color: var(--c-text);
  font-size: 13px;
  font-family: "Roboto Mono", monospace;
`;

const MirMissionTableSelect = ({
  amrId,
  value,
  onSelect,
  placeholder,
}: {
  amrId?: string;
  value?: string;
  onSelect: (missionName: string) => void;
  placeholder?: string;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAllMirMission();

  const filterMissionData = useMemo(
    () =>
      (data ?? [])
        .filter((row) => (amrId ? !!row.robots[amrId] : false))
        .filter((row) => row.name.includes(search)),
    [data, amrId, search],
  );

  const columns = [
    {
      title: t("main.queue_mir_task_modal.mission_name"),
      dataIndex: "name",
      key: "name",
      render: (name: string) => <MissionName>{name}</MissionName>,
    },
    {
      title: t("main.mir_mission_panel.synced"),
      key: "synced_at",
      render: (_: unknown, row: MirMissionRow) => {
        const status = amrId ? row.robots[amrId] : null;
        return status ? dayjs(status.synced_at).fromNow() : "-";
      },
    },
  ];

  return (
    <>
      <IndustrialButton
        type="button"
        className={value ? "selected" : ""}
        disabled={!amrId}
        onClick={() => setOpen(true)}
      >
        {value ??
          (amrId
            ? (placeholder ?? t("main.queue_mir_task_modal.select_mission"))
            : t("main.queue_mir_task_modal.select_mission_first"))}
      </IndustrialButton>

      <IndustrialModal
        title={
          <>
            <DatabaseOutlined />
            {t("main.queue_mir_task_modal.table_title")}
          </>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <SearchContainer>
          <IndustrialInput
            prefix={<SearchOutlined />}
            placeholder={t("main.queue_mir_task_modal.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </SearchContainer>

        <IndustrialTable
          rowKey="name"
          loading={isLoading}
          dataSource={filterMissionData}
          columns={columns}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          locale={{ emptyText: t("main.queue_mir_task_modal.no_synced_mission") }}
          onRow={(record: MirMissionRow) => ({
            onClick: () => {
              onSelect(record.name);
              setOpen(false);
              setSearch("");
            },
          })}
          rowClassName={(record: MirMissionRow) =>
            value === record.name ? "ant-table-row-selected" : ""
          }
        />
      </IndustrialModal>
    </>
  );
};

export default MirMissionTableSelect;
