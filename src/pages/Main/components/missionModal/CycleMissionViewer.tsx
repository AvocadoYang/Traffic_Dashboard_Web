import client from "@/api/axiosClient";
import {
  useCycleMission,
  Cycle,
  Cycle_Mission,
} from "@/sockets/useCycleMission";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { MissionPriority } from "@/types/mission";
import { useMutation } from "@tanstack/react-query";
import {
  message,
  Modal,
  Switch,
  Tooltip,
  Button,
  Collapse,
  Badge,
  Flex,
} from "antd";
import React, { Dispatch, FC, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  UnorderedListOutlined,
  DeleteOutlined,
  PoweroffOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  FileAddTwoTone,
  EditFilled,
  EditOutlined,
} from "@ant-design/icons";

const { Panel } = Collapse;

// Industrial Styled Components
const StyledModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    padding: 12px 16px;
    position: relative;
    border-radius: 0;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #1890ff;
    }

    @media (min-width: 768px) {
      padding: 16px 24px;
    }
  }

  .ant-modal-title {
    font-family: "Roboto Mono", monospace;
    font-size: 13px;
    font-weight: 700;
    color: #1890ff;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;

    @media (min-width: 768px) {
      font-size: 16px;
      letter-spacing: 1.5px;
      gap: 12px;
    }
  }

  .ant-modal-body {
    padding: 16px;
    background: #ffffff;
    max-height: 70vh;
    overflow-y: auto;

    @media (min-width: 768px) {
      padding: 24px;
    }
  }

  .ant-modal-footer {
    background: #fafafa;
    border-top: 2px solid #d9d9d9;
    padding: 12px 16px;
    border-radius: 0;

    @media (min-width: 768px) {
      padding: 16px 24px;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #8c8c8c;
  font-family: "Roboto Mono", monospace;

  .empty-icon {
    font-size: 64px;
    color: #d9d9d9;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #8c8c8c;
  }
`;

const CycleCard = styled.div<{ isActive: boolean }>`
  background: #ffffff;
  border: 2px solid ${({ isActive }) => (isActive ? "#52c41a" : "#d9d9d9")};
  border-left: 4px solid ${({ isActive }) => (isActive ? "#52c41a" : "#8c8c8c")};
  margin-bottom: 16px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ isActive }) => (isActive ? "#73d13d" : "#bfbfbf")};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const CycleHeader = styled.div`
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;

  @media (max-width: 768px) {
    padding: 12px;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const CycleName = styled.div`
  flex: 1;
  font-family: "Roboto Mono", monospace;
  font-size: 13px;
  font-weight: 700;
  color: #262626;
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 11px;
    width: 100%;
    margin-bottom: 8px;
  }
`;

const EditBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: "#fafafa";
  border: 1px solid #d9d9d9;
  color: "#8c8c8c";
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;

  @media (min-width: 768px) {
    font-size: 11px;
  }
`;

const StatusBadge = styled.div<{ isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: ${({ isActive }) => (isActive ? "#f6ffed" : "#fafafa")};
  border: 1px solid ${({ isActive }) => (isActive ? "#52c41a" : "#d9d9d9")};
  color: ${({ isActive }) => (isActive ? "#52c41a" : "#8c8c8c")};
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (min-width: 768px) {
    font-size: 11px;
  }
`;

const MissionCount = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 600;

  @media (min-width: 768px) {
    font-size: 11px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.8px;
  height: 32px;
  font-weight: 600;
  border-radius: 0;
  padding: 0 12px;

  @media (min-width: 768px) {
    font-size: 11px;
    height: 36px;
    padding: 0 16px;
  }

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
  }

  &.danger {
    border-color: #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
    }
  }
`;

const StyledSwitch = styled(Switch)`
  &.ant-switch-checked {
    background: #52c41a;
  }
`;

const MissionList = styled.div`
  padding: 16px;
  background: #fafafa;
`;

const MissionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  margin-bottom: 8px;
  font-family: "Roboto Mono", monospace;
  transition: all 0.2s ease;

  @media (min-width: 768px) {
    gap: 12px;
    padding: 12px;
  }

  &:hover {
    background: #fafafa;
    border-left-color: #fa8c16;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const MissionIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 6px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-size: 10px;
  font-weight: 700;

  @media (min-width: 768px) {
    min-width: 32px;
    height: 24px;
    padding: 0 8px;
    font-size: 11px;
  }
`;

const MissionContent = styled.div`
  flex: 1;
  font-size: 10px;

  @media (min-width: 768px) {
    font-size: 11px;
  }

  .mission-type {
    color: #1890ff;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .mission-details {
    color: #595959;
    font-size: 9px;

    @media (min-width: 768px) {
      font-size: 10px;
    }
  }
`;

const StatsBar = styled.div`
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-left: 3px solid #1890ff;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  font-family: "Roboto Mono", monospace;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 12px;
    padding: 10px 12px;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;

  @media (max-width: 768px) {
    font-size: 10px;
  }

  .label {
    color: #595959;
    text-transform: uppercase;
  }

  .value {
    color: #1890ff;
    font-weight: 700;
  }
`;

const CycleMissionViewer: FC<{
  open: boolean;
  setShowCycleMission: Dispatch<SetStateAction<boolean>>;
  setShowEditCycleMission: Dispatch<SetStateAction<boolean>>;
  setEditCyc: Dispatch<SetStateAction<Cycle | null>>;
}> = ({ open, setShowCycleMission, setShowEditCycleMission, setEditCyc }) => {
  const data = useCycleMission();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const OnOffMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) => {
      return client.post("api/missions/acive-cycle", data);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const removeMutation = useMutation({
    mutationFn: (data: { id: string }) => {
      return client.post("api/missions/remove-cycle", data);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleOnOff = (id: string, isActive: boolean) => {
    OnOffMutation.mutate({
      id,
      isActive,
    });
  };

  const handleRemove = (id: string) => {
    removeMutation.mutate({ id });
  };

  const getPriorityLabel = (priority: MissionPriority) => {
    return t(`mission.cycle_mission.priority.${MissionPriority[priority]}`);
  };

  const getMissionDisplay = (mission: Cycle_Mission) => {
    if (mission.missionType === "normal") {
      return `${t("mission.cycle_mission.mission_prefix")} ${mission.missionId}`;
    } else if (mission.missionType === "dynamic") {
      return `${mission.eptS} → ${mission.eptD}`;
    } else if (mission.missionType === "direct") {
      return `${mission.dirEpt} [${mission.dirEptControl}]`;
    }
    return "";
  };

  const handleEdit = (v: Cycle) => {
    setEditCyc(v);
    setShowEditCycleMission(true);
  };

  const totalCycles = data.length;
  const activeCycles = data.filter((c) => c.IsActive).length;
  const totalMissions = data.reduce(
    (acc, cycle) => acc + cycle.Payload.length,
    0
  );

  return (
    <>
      {contextHolder}
      <StyledModal
        open={open}
        onCancel={() => setShowCycleMission(false)}
        title={
          <>
            <UnorderedListOutlined />
            {t("mission.cycle_mission.viewer_title")}
          </>
        }
        width={900}
        footer={null}
      >
        <StatsBar>
          <Flex
            justify="space-between"
            align="stretch"
            style={{ width: "100%" }}
          >
            <Flex gap="middle">
              <StatItem>
                <InfoCircleOutlined style={{ color: "#1890ff" }} />
                <span className="label">
                  {t("mission.cycle_mission.total_cycles")}
                </span>
                <span className="value">{totalCycles}</span>
              </StatItem>
              <StatItem>
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                <span className="label">
                  {t("mission.cycle_mission.active")}
                </span>
                <span className="value">{activeCycles}</span>
              </StatItem>
              <StatItem>
                <RocketOutlined style={{ color: "#1890ff" }} />
                <span className="label">
                  {t("mission.cycle_mission.total_missions")}
                </span>
                <span className="value">{totalMissions}</span>
              </StatItem>
            </Flex>

            <Button
              onClick={() => setShowEditCycleMission(true)}
              icon={<FileAddTwoTone />}
            >
              {t("mission.cycle_mission.add_cycle_mission")}
            </Button>
          </Flex>
        </StatsBar>

        {data.length === 0 ? (
          <EmptyState>
            <div className="empty-icon">
              <WarningOutlined />
            </div>
            <div className="empty-text">
              {t("mission.cycle_mission.no_cycle_missions_available")}
            </div>
          </EmptyState>
        ) : (
          data.map((cycle) => (
            <CycleCard key={cycle.Id} isActive={cycle.IsActive}>
              <CycleHeader>
                <CycleName>{cycle.Name}</CycleName>

                <EditBadge onClick={() => handleEdit(cycle)}>
                  <EditOutlined></EditOutlined>
                  {t("utils.edit")}
                </EditBadge>
                <StatusBadge isActive={cycle.IsActive}>
                  {cycle.IsActive ? (
                    <>
                      <CheckCircleOutlined />
                      {t("utils.active")}
                    </>
                  ) : (
                    <>
                      <CloseCircleOutlined />
                      {t("utils.inactive")}
                    </>
                  )}
                </StatusBadge>
                <MissionCount>
                  <RocketOutlined />
                  {cycle.Payload.length} {t("mission.cycle_mission.missions")}
                </MissionCount>
                <ActionButtons>
                  <Tooltip
                    title={
                      cycle.IsActive
                        ? t("mission.cycle_mission.deactivate")
                        : t("mission.cycle_mission.activate")
                    }
                  >
                    <StyledSwitch
                      checked={cycle.IsActive}
                      onChange={(checked) => handleOnOff(cycle.Id, checked)}
                      checkedChildren={<PoweroffOutlined />}
                      unCheckedChildren={<PoweroffOutlined />}
                    />
                  </Tooltip>
                  <Tooltip title={t("mission.cycle_mission.delete_cycle")}>
                    <IndustrialButton
                      className="danger"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemove(cycle.Id)}
                      loading={removeMutation.isPending}
                    />
                  </Tooltip>
                </ActionButtons>
              </CycleHeader>

              <MissionList>
                {cycle.Payload.map((mission, index) => (
                  <MissionItem key={index}>
                    <MissionIndex>#{index + 1}</MissionIndex>
                    <MissionContent>
                      <div className="mission-type">{mission.missionType}</div>
                      <div className="mission-details">
                        {t("mission.cycle_mission.amr_label")}: {mission.amrId}{" "}
                        | {t("mission.cycle_mission.priority_label")}:{" "}
                        {getPriorityLabel(mission.priority)} |{" "}
                        {getMissionDisplay(mission)}
                      </div>
                    </MissionContent>
                  </MissionItem>
                ))}
              </MissionList>
            </CycleCard>
          ))
        )}
      </StyledModal>
    </>
  );
};

export default CycleMissionViewer;
