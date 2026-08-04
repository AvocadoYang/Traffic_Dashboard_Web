import { FC, memo } from "react";
import { Flex, Progress, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useAllMapInfo from "@/api/useAllMapInfo";
import useMapGroup from "@/api/useMapGroup";
import useMirSyncJobs, {
  MirSyncJob,
  MirSyncJobState,
} from "@/api/useMirSyncJobs";
import {
  IndustrialButton,
  IndustrialModal,
  IndustrialTable,
} from "./industrialStyle";

const JOB_STATE_COLORS: Record<MirSyncJobState, string> = {
  pending: "#8c8c8c",
  pushing: "#1890ff",
  verifying: "#faad14",
  done: "#52c41a",
  failed: "#ff4d4f",
};

const JobStateBadge = styled.div<{ $state: MirSyncJobState }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #ffffff;
  border: 1px solid ${({ $state }) => JOB_STATE_COLORS[$state] ?? "#8c8c8c"};
  color: ${({ $state }) => JOB_STATE_COLORS[$state] ?? "#8c8c8c"};
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const MonoText = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
`;

const SyncJobsModal: FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { data: maps } = useAllMapInfo();
  const { data: mapGroups } = useMapGroup();
  const { data: syncJobs, isFetching, refetch } = useMirSyncJobs(open);

  // 以 map / group id 對照名稱，避免直接顯示 id
  const mapNameById = new Map<string, string>(
    (maps?.allMap || []).map((map: { id: string; fileName: string }) => [
      map.id,
      map.fileName,
    ]),
  );

  const groupNameById = new Map<string, string>(
    (mapGroups || []).map((group) => [group.id, group.group_name]),
  );

  const columns = [
    {
      title: t("map_manager.sync_job_vehicle"),
      dataIndex: "vehicle_id",
      key: "vehicle_id",
      render: (vehicleId: string) => <MonoText>{vehicleId}</MonoText>,
    },
    {
      title: t("map_manager.map_group"),
      dataIndex: "target_group_id",
      key: "target_group_id",
      render: (groupId: string) => groupNameById.get(groupId) || "-",
    },
    {
      title: t("map_manager.sync_job_state"),
      dataIndex: "state",
      key: "state",
      render: (state: MirSyncJobState) => (
        <JobStateBadge $state={state}>
          {t(`map_manager.sync_job_state_${state}` as any, state)}
        </JobStateBadge>
      ),
    },
    {
      title: t("map_manager.sync_job_progress"),
      dataIndex: "progress",
      key: "progress",
      width: 180,
      render: (progress: number, record: MirSyncJob) => (
        <Progress
          percent={progress}
          size="small"
          status={
            record.state === "failed"
              ? "exception"
              : record.state === "done"
                ? "success"
                : "active"
          }
        />
      ),
    },
    {
      title: t("map_manager.sync_job_maps"),
      key: "per_map_state",
      render: (_: any, record: MirSyncJob) => {
        const states = Object.values(record.per_map_state || {});
        const doneCount = states.filter((s) => s === "done").length;
        return (
          <MonoText>
            {doneCount}/{states.length}
          </MonoText>
        );
      },
    },
    {
      title: t("map_manager.sync_job_attempts"),
      dataIndex: "attempts",
      key: "attempts",
    },
    {
      title: t("map_manager.sync_job_updated_at"),
      dataIndex: "updated_at",
      key: "updated_at",
      render: (updatedAt: string) => (
        <MonoText>{new Date(updatedAt).toLocaleString()}</MonoText>
      ),
    },
    {
      title: t("map_manager.sync_job_error"),
      dataIndex: "error",
      key: "error",
      render: (error: string | null) =>
        error ? <span style={{ color: "#ff4d4f" }}>{error}</span> : "-",
    },
  ];

  return (
    <IndustrialModal
      title={t("map_manager.sync_jobs_modal_title")}
      open={open}
      onCancel={onClose}
      width={1100}
      footer={
        <Flex justify="end" gap="small">
          <IndustrialButton
            className="view-btn"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            {t("map_manager.sync_jobs_refresh")}
          </IndustrialButton>
          <IndustrialButton onClick={onClose}>
            {t("utils.close")}
          </IndustrialButton>
        </Flex>
      }
    >
      <IndustrialTable
        columns={columns as any}
        dataSource={syncJobs || []}
        rowKey="id"
        loading={isFetching}
        pagination={false}
        size="small"
        expandable={{
          expandedRowRender: (row: unknown) => {
            const record = row as MirSyncJob;
            return (
              <Flex gap="small" wrap="wrap">
                {Object.entries(record.per_map_state || {}).map(
                  ([mapId, state]) => (
                    <Tag
                      key={mapId}
                      color={
                        state === "done"
                          ? "success"
                          : state === "failed"
                            ? "error"
                            : "processing"
                      }
                    >
                      {mapNameById.get(mapId) || "-"} : {state}
                    </Tag>
                  ),
                )}
              </Flex>
            );
          },
          rowExpandable: (row: unknown) =>
            Object.keys((row as MirSyncJob).per_map_state || {}).length > 0,
        }}
        locale={{ emptyText: t("map_manager.sync_jobs_empty") }}
      />
    </IndustrialModal>
  );
};

export default memo(SyncJobsModal);
