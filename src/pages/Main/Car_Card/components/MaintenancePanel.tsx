import client from "@/api/axiosClient";
import { MaintenanceLevel } from "@/sockets/useAMRInfo";
import { DownOutlined, ToolOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Dropdown, MenuProps, message } from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const IndustrialDropdown = styled.div`
  box-sizing: border-box;
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  border-radius: 4px;
  color: var(--c-text);
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
  }

  .icon {
    font-size: 15px;
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
    background: var(--c-bg);
    border: 1px solid var(--c-border-strong);
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 0;
    overflow: hidden;
  }

  .ant-dropdown-menu-item {
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
    color: var(--c-text);
    padding: 8px 12px;
    border-bottom: 1px solid var(--c-border);
    border-radius: 0;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--c-header-accent-soft);
      color: var(--c-header-accent);
    }
  }
`;

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

  const dropdownRender = () => (
    <StyledDropdownMenu>
      <div className="ant-dropdown-menu">
        {items.map((item: any) => (
          <div
            key={item!.key}
            className="ant-dropdown-menu-item"
            onClick={() => onClick({ key: item!.key as string } as any)}
          >
            {item!.label}
          </div>
        ))}
      </div>
    </StyledDropdownMenu>
  );

  return (
    <>
      {contextHolder}
      <Dropdown
        menu={{ items, onClick }}
        trigger={["click"]}
        placement="bottom"
        popupRender={dropdownRender}
      >
        <IndustrialDropdown>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ToolOutlined className="icon" />
            <span>{t("maintenance.update")}</span>
          </div>
          <DownOutlined className="arrow" />
        </IndustrialDropdown>
      </Dropdown>
    </>
  );
};

export default MaintenancePanel;
