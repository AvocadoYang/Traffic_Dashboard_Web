/* eslint-disable no-void */

import { Flex, Button, message, MenuProps, Dropdown } from "antd";
import { useTranslation } from "react-i18next";
import { FC, useState } from "react";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { MaintenanceLevel } from "@/sockets/useAMRInfo";
import styled from "styled-components";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import EditCargoCarrier from "./EditCargoCarrier";

const StyledFlex = styled(Flex)`
  width: 100%;
  border-radius: 6px;
  padding: 12px;
  background: #f5f5f5;
`;

const StyledButton = styled(Button)`
  width: 10em;
  height: 40px;
  font-size: 14px;
  border-radius: 6px;
`;

const StyledDropdownButton = styled.div`
  width: 10em;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1890ff;
  color: white;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #40a9ff;
  }
`;

const BtnGroup: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [isCarrierModalOpen, setIsCarrierModalOpen] = useState(false);

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

  const handleEmergencyStop = (isStop: boolean) => {
    emergencyMutation.mutate(isStop);
  };

  const handleDelMis = () => {
    deleteMissionMutation.mutate();
  };

  return (
    <>
      {contextHolder}
      <StyledFlex justify="center" align="center" vertical gap="middle">
        <StyledButton
          type="default"
          variant="outlined"
          onClick={() => manualChargeMutation.mutate()}
        >
          {t("charge.charge")}
        </StyledButton>
        <StyledButton
          type="default"
          variant="outlined"
          danger
          onClick={() => handleDelMis()}
        >
          {t("amr_card.delete_current_mission")}
        </StyledButton>
        <MaintenancePanel amrId={amrId} />

        <StyledButton
          type="default"
          variant="outlined"
          danger
          onClick={() => handleEmergencyStop(true)}
        >
          {t("amr_card.emergency_stop")}
        </StyledButton>

        <StyledButton
          type="default"
          variant="outlined"
          onClick={() => handleEmergencyStop(false)}
        >
          {t("amr_card.continue_move")}
        </StyledButton>

        <StyledButton
          type="default"
          variant="outlined"
          onClick={() => setIsCarrierModalOpen(true)}
        >
          {t("amr_card.update_cargo")}
        </StyledButton>
      </StyledFlex>

      {isCarrierModalOpen && (
        <EditCargoCarrier
          amrId={amrId}
          isModalOpen={isCarrierModalOpen}
          setIsModalOpen={setIsCarrierModalOpen}
        />
      )}
    </>
  );
};

const MaintenancePanel: FC<{ amrId: string }> = ({ amrId }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();

  const maintenanceMutation = useMutation({
    mutationFn: (maintenanceLevel: string) => {
      return client.post("/api/amr/update-maintenance-level", {
        amrId,
        maintenanceLevel,
      });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: () => {
      void messageApi.error(t("mission.charge_mission.haventSetChargeMission"));
    },
  });

  const onClick: MenuProps["onClick"] = ({ key }) => {
    maintenanceMutation.mutate(key);
  };

  const items: MenuProps["items"] = [
    {
      label: t("maintenance.unknown"),
      key: MaintenanceLevel.UNKNOWN.toString(),
    },
    {
      label: t("maintenance.normal"),
      key: MaintenanceLevel.NORMAL.toString(),
    },
    {
      label: t("maintenance.forbidden_all_mission"),
      key: MaintenanceLevel.FORBIDDEN_ALL_MISSION.toString(),
    },
    {
      label: t("maintenance.forbidden_wcs_mission"),
      key: MaintenanceLevel.FORBIDDEN_WCS_MISSION.toString(),
    },
    {
      label: t("maintenance.forbidden_rcs_mission"),
      key: MaintenanceLevel.FORBIDDEN_RCS_MISSION.toString(),
    },
    {
      label: t("maintenance.forbidden_user_mission"),
      key: MaintenanceLevel.FORBIDDEN_USER_MISSION.toString(),
    },
    {
      label: t("maintenance.broken"),
      key: MaintenanceLevel.BROKEN.toString(),
    },
  ];

  return (
    <>
      {contextHolder}
      <Dropdown
        menu={{ items, onClick }}
        trigger={["click"]}
        placement="bottom"
      >
        <StyledDropdownButton>{t("maintenance.update")}</StyledDropdownButton>
      </Dropdown>
    </>
  );
};

export default BtnGroup;
