import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Card,
  Typography,
  Tag,
  Progress,
  Descriptions,
  Table,
  Button,
  Modal,
  Flex,
} from "antd";
import ReactJsonView from "@uiw/react-json-view";
import {
  ArrowLeftOutlined,
  RobotOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  useAMRAllIO,
  useAmrDetail,
  useAmrPose,
  useIsCarry,
  useIsLogIn,
  useMaintenanceStatus,
} from "@/sockets/useAMRInfo";
import { useRecentMission } from "@/sockets/useMissions";
import { useTranslation } from "react-i18next";
import DPad from "./DPad";
import EditCargoCarrier from "../Main/Car_Card/components/EditCargoCarrier";
import styled from "styled-components";

const { Title, Text } = Typography;

const DetailContainer = styled.div`
  max-width: 900px;
  margin: 40px auto;
  padding: 24px;
  background: #ffffff;
  border: 2px solid #d9d9d9;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
  font-family: "Roboto Mono", monospace;

  @media (max-width: 900px) {
    max-width: 98vw;
    padding: 16px;
    margin: 20px auto;
  }
`;

const BackButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  margin-bottom: 24px;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
  }
`;

const DetailHeader = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 16px 20px;
  margin-bottom: 24px;

  h2 {
    margin: 0 0 12px 0;
    color: #1890ff;
    font-family: "Roboto Mono", monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
`;

const IndustrialTag = styled(Tag)`
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 0;
`;

const IndustrialDescriptions = styled(Descriptions)`
  .ant-descriptions-item-label {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    color: #595959;
    background: #fafafa !important;
  }

  .ant-descriptions-item-content {
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
  }

  .ant-descriptions-bordered .ant-descriptions-item-label,
  .ant-descriptions-bordered .ant-descriptions-item-content {
    border-color: #d9d9d9;
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 40px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s;

  &.ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;

    &:hover {
      background: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }
`;

const IndustrialTable = styled(Table)`
  .ant-table {
    border: 1px solid #d9d9d9;
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr > td {
    font-size: 12px;
  }
`;

const SectionTitle = styled(Title)`
  &&& {
    margin: 24px 0 16px 0;
    font-family: "Roboto Mono", monospace;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #262626;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 2px solid #d9d9d9;
  }
`;

const AmrDetail = () => {
  const { amrId } = useParams<{ amrId: string }>();
  let prefixAmrId = "";
  if (amrId?.startsWith("mock")) {
    prefixAmrId = `#` + amrId.slice(5);
  } else {
    prefixAmrId = amrId || "";
  }

  const amr = useAmrDetail(prefixAmrId || "");
  const currier = useIsCarry(prefixAmrId || "");
  const maintenance = useMaintenanceStatus(prefixAmrId || "");
  const { pose } = useAmrPose(prefixAmrId || "");
  const { recentMission } = useRecentMission(prefixAmrId || "");
  const connectionStatus = useIsLogIn(prefixAmrId || "");
  const io = useAMRAllIO(prefixAmrId || "");
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showCargoMetadata, setShowCargoMetadata] = useState(false);
  const [showIO, setShowIO] = useState(false);
  const [editCargoModalOpen, setEditCargoModalOpen] = useState(false);
  const { t } = useTranslation();

  const missionTasks = recentMission
    ? [
        {
          key: recentMission.missionId,
          id: recentMission.missionId,
          desc:
            recentMission.full_name?.join(" / ") ||
            recentMission.sub_name ||
            "-",
          status: recentMission.missionStatus,
          time: recentMission.startedAt
            ? new Date(recentMission.startedAt).toLocaleTimeString()
            : "-",
        },
      ]
    : [];

  return (
    <>
      <DetailContainer>
        <Link to="/amr">
          <BackButton icon={<ArrowLeftOutlined />}>
            {t("amr_detail.back")}
          </BackButton>
        </Link>
        {amr ? (
          <>
            <DetailHeader>
              <h2>
                <RobotOutlined />
                {prefixAmrId}
              </h2>
              <Flex gap="small" wrap="wrap">
                <IndustrialTag
                  color={connectionStatus.isOnline ? "green" : "red"}
                >
                  {connectionStatus.isOnline
                    ? t("amr_detail.online")
                    : t("amr_detail.offline")}
                </IndustrialTag>
                <IndustrialTag
                  color={connectionStatus.isOverdue ? "red" : "blue"}
                >
                  {connectionStatus.isOverdue
                    ? t("amr_detail.overdue")
                    : t("amr_detail.normal")}
                </IndustrialTag>
                <IndustrialTag
                  color={connectionStatus.isPosAccurate ? "green" : "orange"}
                >
                  {connectionStatus.isPosAccurate
                    ? t("amr_detail.accurate")
                    : t("amr_detail.inaccurate")}
                </IndustrialTag>
                <IndustrialTag color="default">
                  {t("amr_detail.delay", { ms: connectionStatus.networkDelay })}
                </IndustrialTag>
              </Flex>
            </DetailHeader>

            <IndustrialDescriptions
              bordered
              column={1}
              size="middle"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item
                label={
                  <>
                    <ThunderboltOutlined /> {t("amr_detail.battery")}
                  </>
                }
              >
                <Progress
                  percent={amr.battery}
                  size="small"
                  status={amr.battery < 20 ? "exception" : "active"}
                />
              </Descriptions.Item>

              <Descriptions.Item label={t("amr_detail.status")}>
                <Text style={{ fontWeight: 600 }}>{amr.status || "-"}</Text>
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <>
                    <EnvironmentOutlined /> {t("amr_detail.location")}
                  </>
                }
              >
                <Text>{amr.locationId || "-"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label={t("amr_detail.current_position")}>
                <Text>
                  {pose && typeof pose === "object"
                    ? `X: ${pose.x ?? "-"} | Y: ${pose.y ?? "-"} | θ: ${pose.yaw ?? "-"}`
                    : "-"}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label={t("amr_detail.carrying_cargo")}>
                <Flex gap="small" wrap="wrap">
                  {currier.isCarry ? (
                    <>
                      <IndustrialTag color="volcano">
                        {t("utils.yes")}
                      </IndustrialTag>
                      <IndustrialButton
                        size="small"
                        onClick={() => setShowCargoMetadata(true)}
                      >
                        {t("amr_detail.show_cargo_metadata")}
                      </IndustrialButton>
                    </>
                  ) : (
                    <IndustrialTag>{t("utils.no")}</IndustrialTag>
                  )}
                  <IndustrialButton
                    size="small"
                    type="primary"
                    onClick={() => setEditCargoModalOpen(true)}
                  >
                    {t("amr_card.update_cargo")}
                  </IndustrialButton>
                </Flex>
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <>
                    <ToolOutlined /> {t("amr_detail.maintenance")}
                  </>
                }
              >
                <Text>
                  {maintenance && typeof maintenance === "object"
                    ? maintenance.status || JSON.stringify(maintenance)
                    : maintenance
                      ? String(maintenance)
                      : "-"}
                </Text>
              </Descriptions.Item>
            </IndustrialDescriptions>

            <Flex gap="middle" wrap="wrap" style={{ marginBottom: 24 }}>
              <IndustrialButton
                type="primary"
                onClick={() => setShowControlPanel((v) => !v)}
                style={{ flex: 1, minWidth: 200 }}
              >
                {showControlPanel
                  ? t("amr_detail.hide_manual")
                  : t("amr_detail.show_manual")}
              </IndustrialButton>

              <IndustrialButton
                type="primary"
                onClick={() => setShowIO((v) => !v)}
                style={{ flex: 1, minWidth: 200 }}
              >
                {showIO ? t("amr_detail.hide_io") : t("amr_detail.show_io")}
              </IndustrialButton>
            </Flex>

            {showControlPanel && <DPad amrId={prefixAmrId} />}

            {showIO && (
              <Card
                style={{
                  marginBottom: 24,
                  border: "2px solid #d9d9d9",
                  borderRadius: 0,
                }}
              >
                <SectionTitle level={4}>
                  <ToolOutlined />
                  {t("amr_detail.io")}
                </SectionTitle>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {io && Object.keys(io).length > 0 ? (
                    <ReactJsonView
                      displayDataTypes={false}
                      value={io}
                      collapsed={false}
                      enableClipboard={false}
                      style={{ fontSize: 12, fontFamily: "Roboto Mono" }}
                    />
                  ) : (
                    t("amr_detail.no_io")
                  )}
                </pre>
              </Card>
            )}

            <SectionTitle level={4}>
              {t("amr_detail.recent_tasks")}
            </SectionTitle>
            <IndustrialTable
              dataSource={missionTasks}
              pagination={false}
              size="middle"
              columns={[
                {
                  title: t("amr_detail.task_id"),
                  dataIndex: "id",
                  key: "id",
                  render(value: string) {
                    return `${value.slice(0, 8)}...`;
                  },
                },
                {
                  title: t("amr_detail.desc"),
                  dataIndex: "desc",
                  key: "desc",
                },
                {
                  title: t("amr_detail.status"),
                  dataIndex: "status",
                  key: "status",
                  render: (status) => (
                    <IndustrialTag
                      color={
                        status === "Completed"
                          ? "green"
                          : status === "In Progress"
                            ? "blue"
                            : "default"
                      }
                    >
                      {status}
                    </IndustrialTag>
                  ),
                },
                {
                  title: t("amr_detail.time"),
                  dataIndex: "time",
                  key: "time",
                },
              ]}
              locale={{ emptyText: t("amr_detail.no_mission") }}
            />
          </>
        ) : (
          <Card
            style={{
              border: "2px solid #d9d9d9",
              borderRadius: 0,
            }}
          >
            <Title level={4}>{t("amr_detail.amr_not_found")}</Title>
            <Text type="secondary">{t("amr_detail.no_data")}</Text>
          </Card>
        )}
      </DetailContainer>

      <Modal
        open={showCargoMetadata}
        onCancel={() => setShowCargoMetadata(false)}
        footer={null}
        title={t("amr_detail.cargo_metadata")}
      >
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {Array.isArray(currier.cargo) && currier.cargo.length > 0
            ? currier.cargo.map((cargo, idx) =>
                cargo.metadata && cargo.metadata !== "null" ? (
                  <div key={idx} style={{ marginBottom: 16 }}>
                    <b>
                      {t("amr_detail.carrying_cargo")} #{idx + 1}
                    </b>
                    <ReactJsonView
                      displayDataTypes={false}
                      value={
                        typeof cargo.metadata === "string"
                          ? JSON.parse(cargo.metadata)
                          : cargo.metadata
                      }
                      collapsed={false}
                      enableClipboard={false}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                ) : (
                  <div key={idx}>
                    <b>
                      {t("amr_detail.carrying_cargo")} #{idx + 1}
                    </b>
                    <div>{t("amr_detail.no_metadata")}</div>
                  </div>
                )
              )
            : t("amr_detail.no_metadata")}
        </pre>
      </Modal>

      <EditCargoCarrier
        amrId={prefixAmrId}
        isModalOpen={editCargoModalOpen}
        setIsModalOpen={setEditCargoModalOpen}
      />
    </>
  );
};

export default AmrDetail;
