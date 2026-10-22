import { FC } from "react";
import {
  RedoOutlined,
  PlayCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  FireOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { Button, Flex, message } from "antd";
import { useTranslation } from "react-i18next";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import MaintenancePanel from "../Main/Car_Card/components/MaintenancePanel";

const IndustrialContainer = styled(Flex)`
  width: 100%;
  border: 2px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  padding: 20px;
  background: var(--c-bg);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.02);
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(24, 144, 255, 0.02) 2px,
      rgba(24, 144, 255, 0.02) 4px
    );
    pointer-events: none;
  }
`;

const SectionHeader = styled.div`
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-header-border);
  border-left: 3px solid var(--c-header-accent);
  padding: 8px 12px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: var(--c-header-accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`;

const IndustrialButton = styled(Button)`
  width: 100%;
  height: 44px;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2));
    transition: width 0.3s;
  }

  &:hover::before {
    width: 100%;
  }

  &.charge-btn {
    background: var(--c-bg);
    border: 1px solid var(--c-success);
    color: var(--c-success);

    &:hover {
      background: var(--c-success-soft);
      border-color: var(--c-success);
      color: var(--c-success);
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
    }
  }

  &.delete-btn {
    background: var(--c-bg);
    border: 1px solid var(--c-danger);
    color: var(--c-danger);

    &:hover {
      background: var(--c-danger-soft);
      border-color: var(--c-danger);
      color: var(--c-danger);
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
    }
  }

  &.force-delete-btn {
    background: var(--c-danger);
    border: 1px solid var(--c-danger);
    color: #ffffff;

    &:hover {
      background: var(--c-danger);
      border-color: var(--c-danger);
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.4);
    }
  }

  &.emergency-btn {
    background: var(--c-danger);
    border: 2px solid var(--c-danger);
    color: #ffffff;
    font-weight: 700;
    animation: pulse 2s ease-in-out infinite;

    &:hover {
      background: var(--c-danger);
      border-color: var(--c-danger);
      box-shadow: 0 0 20px rgba(255, 77, 79, 0.5);
    }

    @keyframes pulse {
      0%,
      100% {
        box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(255, 77, 79, 0);
      }
    }
  }

  &.continue-btn {
    background: var(--c-bg);
    border: 1px solid var(--c-header-accent);
    color: var(--c-header-accent);

    &:hover {
      background: var(--c-header-accent-soft);
      border-color: var(--c-header-accent);
      color: var(--c-header-accent);
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
  }

  &.update-btn {
    background: var(--c-bg);
    border: 1px solid var(--c-warning);
    color: var(--c-warning);

    &:hover {
      background: var(--c-warning-soft);
      border-color: #ffc53d;
      color: #ffc53d;
      box-shadow: 0 2px 8px rgba(250, 173, 20, 0.3);
    }
  }

  &.reset-btn {
    background: var(--c-warning);
    border: 1px solid var(--c-warning);
    color: #ffffff;
    font-weight: 700;

    &:hover {
      background: #ffc53d;
      border-color: #ffc53d;
      box-shadow: 0 2px 8px rgba(250, 173, 20, 0.4);
    }
  }
`;

const IndustrialDropdown = styled.div`
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--c-bg);
  border: 1px solid #722ed1;
  color: #722ed1;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  font-weight: 600;
  padding: 0 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #722ed1;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover {
    background: #f9f0ff;
    border-color: #9254de;
    color: #9254de;
    box-shadow: 0 2px 8px rgba(114, 46, 209, 0.3);

    &::before {
      opacity: 1;
    }
  }

  .icon {
    font-size: 14px;
  }

  .arrow {
    font-size: 10px;
    transition: transform 0.2s;
  }

  &:hover .arrow {
    transform: translateY(2px);
  }
`;

const StyledDropdownMenu = styled.div`
  .ant-dropdown-menu {
    border: 2px solid var(--c-header-border);
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 0;
  }

  .ant-dropdown-menu-item {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--c-bg-muted);
    transition: all 0.2s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: #f9f0ff;
      color: #722ed1;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  position: relative;
  z-index: 1;
`;

const Divider = styled.div`
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    var(--c-header-border) 0,
    var(--c-header-border) 8px,
    transparent 8px,
    transparent 16px
  );
  margin: 12px 0;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    background: var(--c-danger);
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px var(--c-header-border);
  }
`;

const DPad: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const forceIdleMutation = useMutation({
    mutationFn: () => {
      return client.post("api/amr/force-idle", { amrId });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const resetMutation = useMutation({
    mutationFn: () => {
      return client.post("api/amr/reset", { amrId });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const manualChargeMutation = useMutation({
    mutationFn: () => {
      return client.post("/api/amr/amr-charge", { amrId });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const emergencyMutation = useMutation({
    mutationFn: (isStop: boolean) => {
      return client.post("/api/amr/emergency-stop", { amrId, isStop });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMissionMutation = useMutation({
    mutationFn: () => {
      return client.post("/api/amr/delete-mission", { amrId });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const forceDeleteMissionMutation = useMutation({
    mutationFn: () => {
      return client.post("/api/amr/force-delete-mission", { amrId });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleEmergencyStop = (isStop: boolean) => {
    emergencyMutation.mutate(isStop);
  };

  const handleDelMis = () => {
    deleteMissionMutation.mutate();
  };

  const handleForceDelMis = () => {
    forceDeleteMissionMutation.mutate();
  };

  return (
    <>
      {contextHolder}
      <IndustrialContainer justify="center" align="center" vertical gap="none">
        <ButtonGroup>
          {/* Charge Section */}
          <IndustrialButton
            className="charge-btn"
            onClick={() => manualChargeMutation.mutate()}
            icon={<ThunderboltOutlined />}
          >
            {t("charge.charge")}
          </IndustrialButton>

          <Divider />

          {/* Mission Management */}
          <IndustrialButton
            className="delete-btn"
            onClick={() => handleDelMis()}
            icon={<DeleteOutlined />}
          >
            {t("amr_card.delete_current_mission")}
          </IndustrialButton>

          <IndustrialButton
            className="force-delete-btn"
            onClick={() => handleForceDelMis()}
            icon={<FireOutlined />}
          >
            {t("amr_card.force_delete_mission")}
          </IndustrialButton>

          <Divider />

          {/* Maintenance Level */}
          <MaintenancePanel amrId={amrId} />

          <Divider />

          {/* Emergency Controls */}
          <IndustrialButton
            className="emergency-btn"
            onClick={() => handleEmergencyStop(true)}
            icon={<WarningOutlined />}
          >
            {t("amr_card.emergency_stop")}
          </IndustrialButton>

          <IndustrialButton
            className="continue-btn"
            onClick={() => handleEmergencyStop(false)}
            icon={<PlayCircleOutlined />}
          >
            {t("amr_card.continue_move")}
          </IndustrialButton>

          <Divider />

          {/* Update Actions */}

          <IndustrialButton
            className="reset-btn"
            onClick={() => resetMutation.mutate()}
            icon={<RedoOutlined />}
          >
            {t("amr_detail.reset")}
          </IndustrialButton>
        </ButtonGroup>
      </IndustrialContainer>
    </>
  );
};

export default DPad;
