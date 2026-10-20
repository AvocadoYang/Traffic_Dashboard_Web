import { FC } from "react";
import { Alert, Descriptions, Modal, Spin, Tag, Typography } from "antd";
import moment from "moment";
import { useTranslation } from "react-i18next";
import useMissionDetail from "@/api/useMissionDetail";
import I18nCancelReason from "@/i18n/I18nCancelReason";
import { MissionStatus } from "@/types/mission";
import MissionCargoEvents from "./MissionCargoEvents";

const { Text, Title } = Typography;

const STATUS_LABEL_KEY: Record<number, string> = {
  [MissionStatus.PENDING]: "mission_history.pending",
  [MissionStatus.ASSIGNED]: "mission_history.assigned",
  [MissionStatus.EXECUTING]: "mission_history.executing",
  [MissionStatus.COMPLETED]: "mission_history.completed",
  [MissionStatus.ABORTING]: "mission_history.aborting",
  [MissionStatus.CANCELED]: "mission_history.canceled",
  [MissionStatus.WAITING]: "mission_history.waiting",
};

const fmt = (v?: string | null) =>
  v ? moment(v).format("YYYY-MM-DD HH:mm:ss") : "—";

/** 原地彈出任務詳情 (貨物紀錄點任務 ID 用), 同時列出這個任務搬過的貨物 */
const MissionDetailModal: FC<{
  missionId: string | null;
  onClose: () => void;
}> = ({ missionId, onClose }) => {
  const { t } = useTranslation();
  const { data: mission, isLoading } = useMissionDetail(missionId);

  const canceled =
    mission &&
    (mission.status === MissionStatus.CANCELED ||
      mission.status === MissionStatus.ABORTING);

  return (
    <Modal
      open={!!missionId}
      onCancel={onClose}
      footer={null}
      width={760}
      title={t("cargo_history.mission_detail")}
      destroyOnHidden
    >
      {isLoading ? (
        <Spin />
      ) : !mission ? (
        <Alert
          type="warning"
          showIcon
          message={t("cargo_history.mission_not_found")}
          description={<Text code copyable>{missionId}</Text>}
        />
      ) : (
        <>
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2 }}
            bordered
            items={[
              {
                key: "id",
                label: "ID",
                span: 2,
                children: <Text code copyable>{mission.id}</Text>,
              },
              {
                key: "name",
                label: t("cargo_history.mission"),
                span: 2,
                children:
                  [...(mission.full_name ?? []), mission.sub_name]
                    .filter(Boolean)
                    .join(" / ") || "—",
              },
              {
                key: "status",
                label: t("mission_history.status"),
                children: (
                  <>
                    <Tag>
                      {t(
                        (STATUS_LABEL_KEY[mission.status] ??
                          "mission_history.unknown") as Parameters<typeof t>[0],
                      ) as string}
                    </Tag>
                    {canceled && (
                      <I18nCancelReason reason={mission.cancel_reason} />
                    )}
                  </>
                ),
              },
              {
                key: "amr",
                label: t("mission_history.vehicle"),
                children: mission.amrId,
              },
              {
                key: "created",
                label: t("mission_history.created_at"),
                children: fmt(mission.createdAt),
              },
              {
                key: "assigned",
                label: t("mission_history.assigned_at"),
                children: fmt(mission.assignedAt),
              },
              {
                key: "started",
                label: t("mission_history.started_at"),
                children: fmt(mission.startedAt),
              },
              {
                key: "done",
                label: canceled
                  ? t("mission_history.ended_at")
                  : t("mission_history.completed_at"),
                children: fmt(mission.completedAt),
              },
            ]}
          />
          {mission.message && (
            <Alert
              style={{ marginTop: 8 }}
              type="info"
              showIcon
              message={mission.message}
            />
          )}
        </>
      )}

      <Title level={5} style={{ marginTop: 20 }}>
        {t("cargo_history.cargo_events")}
      </Title>
      {missionId && <MissionCargoEvents missionId={missionId} />}
    </Modal>
  );
};

export default MissionDetailModal;
