/* eslint-disable no-void */

import { message, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { FC, useState } from "react";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import styled, { css } from "styled-components";
import { useSetAtom } from "jotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { localizationCorrection } from "@/utils/gloable";
import AmrCargoPanel from "@/components/CargoPanel/AmrCargoPanel";
import {
  RedoOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  WarningOutlined,
  PlayCircleOutlined,
  EditOutlined,
  FireOutlined,
  CloudSyncOutlined,
  AimOutlined,
  RotateRightOutlined,
} from "@ant-design/icons";
import { isFork } from "@/utils/globalFunction";
import MaintenancePanel from "./MaintenancePanel";
import SpinModal from "./SpinModal";

// 選單外觀跟著全站主題走:一般動作是中性的描邊按鈕,
// 只有「會出事」的動作才上狀態色,而且顏色只分三種:
// danger(刪除 / 暫停 / 關機)、warning(重置)、primary(解除暫停)。
type ActionTone = "default" | "primary" | "warning" | "danger" | "dangerSolid";

const TONE_STYLE: Record<ActionTone, ReturnType<typeof css>> = {
  default: css`
    background: var(--c-bg);
    border-color: var(--c-border-strong);
    color: var(--c-text);

    &:hover {
      background: var(--c-header-accent-soft);
      border-color: var(--c-header-accent);
      color: var(--c-header-accent);
    }
  `,
  primary: css`
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);

    &:hover {
      background: var(--c-header-accent);
      color: var(--c-bg);
    }
  `,
  warning: css`
    background: var(--c-warning-soft);
    border-color: var(--c-warning);
    color: var(--c-text);

    &:hover {
      box-shadow: inset 0 0 0 1px var(--c-warning);
    }
  `,
  danger: css`
    background: var(--c-bg);
    border-color: var(--c-danger);
    color: var(--c-danger);

    &:hover {
      background: var(--c-danger-soft);
    }
  `,
  dangerSolid: css`
    background: var(--c-danger);
    border-color: var(--c-danger);
    color: var(--c-bg);

    &:hover {
      filter: brightness(1.1);
    }
  `,
};

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  /* 在 Popover 裡沒有外框可以撐寬度,自己給一個;放進 Modal 時則跟著 Modal 走 */
  min-width: min(400px, calc(100vw - 80px));
  font-family: "Roboto Mono", monospace;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--c-text-muted);

  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--c-border);
  }
`;

const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
`;

const ActionButton = styled.button<{ $tone?: ActionTone }>`
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease;

  ${({ $tone = "default" }) => TONE_STYLE[$tone]}

  .anticon,
  svg {
    flex-shrink: 0;
    font-size: 15px;
    fill: currentColor;
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 1px;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const BtnGroup: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [isCarrierModalOpen, setIsCarrierModalOpen] = useState(false);
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);
  const setLocalizationCorrection = useSetAtom(localizationCorrection);

  const manualChargeMutation = useMutation({
    mutationFn: () => {
      return client.post("/api/amr/amr-charge", { amrId });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

   const resetChargeMutation = useMutation({
     mutationFn: () => {
       return client.post("/api/amr/amr-charge-reset", { amrId });
     },
     onSuccess: () => {
       void messageApi.success(t("utils.success"));
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

  const updatePositionMutation = useMutation({
    mutationFn: () => {
      return client.post("api/amr/update-position", { amrId });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const shutdownMutation = useMutation({
    mutationFn: () => {
      return client.post("api/amr/shutdown", { amrId });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
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
      <MenuContainer>
        <Section>
          <SectionLabel>{t("amr_card.section_charge")}</SectionLabel>
          <ButtonGroup>
            <ActionButton
              type="button"
              onClick={() => manualChargeMutation.mutate()}
            >
              <ThunderboltOutlined />
              {t("charge.charge")}
            </ActionButton>

            <ActionButton
              type="button"
              onClick={() => resetChargeMutation.mutate()}
            >
              <ThunderboltOutlined />
              {t("amr_card.charge_reset")}
            </ActionButton>
          </ButtonGroup>
        </Section>

        <Section>
          <SectionLabel>{t("amr_card.section_mission")}</SectionLabel>
          <ButtonGroup>
            <ActionButton
              type="button"
              $tone="danger"
              onClick={() => handleDelMis()}
            >
              <DeleteOutlined />
              {t("amr_card.delete_current_mission")}
            </ActionButton>

            <ActionButton
              type="button"
              $tone="dangerSolid"
              onClick={() => handleForceDelMis()}
            >
              <FireOutlined />
              {t("amr_card.force_delete_mission")}
            </ActionButton>

            {isFork(amrId) && (
              <ActionButton
                type="button"
                onClick={() => setIsSpinModalOpen(true)}
              >
                <RotateRightOutlined />
                {t("amr_card.spin")}
              </ActionButton>
            )}
          </ButtonGroup>
        </Section>

        <Section>
          <SectionLabel>{t("amr_card.section_motion")}</SectionLabel>
          <ButtonGroup>
            <ActionButton
              type="button"
              $tone="dangerSolid"
              onClick={() => handleEmergencyStop(true)}
            >
              <WarningOutlined />
              {t("amr_card.emergency_stop")}
            </ActionButton>

            <ActionButton
              type="button"
              $tone="primary"
              onClick={() => handleEmergencyStop(false)}
            >
              <PlayCircleOutlined />
              {t("amr_card.continue_move")}
            </ActionButton>
          </ButtonGroup>
        </Section>

        <Section>
          <SectionLabel>{t("utils.maintenance_level")}</SectionLabel>
          <MaintenancePanel amrId={amrId} />
        </Section>

        <Section>
          <SectionLabel>{t("amr_card.section_system")}</SectionLabel>
          <ButtonGroup>
            <ActionButton
              type="button"
              onClick={() => setIsCarrierModalOpen(true)}
            >
              <EditOutlined />
              {t("amr_card.update_cargo")}
            </ActionButton>

            <Tooltip title={t("amr_card.update_position_hint")} placement="bottom">
              <ActionButton
                type="button"
                onClick={() => updatePositionMutation.mutate()}
              >
                <CloudSyncOutlined />
                {t("amr_detail.update_position")}
              </ActionButton>
            </Tooltip>

            <ActionButton
              type="button"
              onClick={() =>
                setLocalizationCorrection({ amrId, dx: 0, dy: 0, dYaw: 0 })
              }
            >
              <AimOutlined />
              {t("amr_card.localization_correction")}
            </ActionButton>

            <ActionButton
              type="button"
              $tone="warning"
              onClick={() => resetMutation.mutate()}
            >
              <RedoOutlined />
              {t("amr_detail.reset")}
            </ActionButton>

            <ActionButton
              type="button"
              $tone="danger"
              onClick={() => shutdownMutation.mutate()}
            >
              <svg
                width={15}
                height={15}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <title>power</title>
                <path d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13" />
              </svg>
              {t("amr_detail.force_shutdown")}
            </ActionButton>
          </ButtonGroup>
        </Section>
      </MenuContainer>

      <AmrCargoPanel
        amrId={amrId}
        open={isCarrierModalOpen}
        onClose={() => setIsCarrierModalOpen(false)}
      />

      <SpinModal
        amrId={amrId}
        open={isSpinModalOpen}
        onClose={() => setIsSpinModalOpen(false)}
      />
    </>
  );
};

export default BtnGroup;
