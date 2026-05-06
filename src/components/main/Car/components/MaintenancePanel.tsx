import client from "@/api/axiosClient";
import { MaintenanceLevel } from "@/sockets/useAMRInfo";
import { DownOutlined, ToolOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Dropdown, MenuProps, message } from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const IndustrialDropdown = styled.div`
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
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
    border: 2px solid #d9d9d9;
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
    border-bottom: 1px solid #f0f0f0;
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
