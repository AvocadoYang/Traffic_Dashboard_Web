import client from "@/api/axiosClient";
import {
  MaintenanceLevel,
  useIsLogIn,
  useMaintenanceStatus,
} from "@/sockets/useAMRInfo";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  CheckOutlined,
  DownOutlined,
  ToolOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Dropdown, MenuProps, message, Popconfirm } from "antd";
import { MessageInstance } from "antd/es/message/interface";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";

// 車況不是「正常」時用的警示色:毀損用 danger,其餘(含初始值)用 warning
type AlertTone = "warning" | "danger";

const alertTone = (level: MaintenanceLevel | undefined): AlertTone =>
  level === MaintenanceLevel.BROKEN ? "danger" : "warning";

const useUpdateMaintenance = (amrId: string, messageApi: MessageInstance) => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (maintenanceLevel: string) => {
      return client.post("/api/amr/update-maintenance-level", {
        amrId,
        maintenanceLevel,
      });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });
};

const PanelRow = styled.div`
  display: flex;
  gap: 6px;
`;

const RestoreButton = styled.button`
  all: unset;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 12px;
  border: 1px solid var(--c-header-accent);
  border-radius: 4px;
  background: var(--c-header-accent-soft);
  color: var(--c-header-accent);
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--c-header-accent);
    color: var(--c-bg);
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 1px;
  }
`;

const IndustrialDropdown = styled.div<{ $tone?: AlertTone }>`
  box-sizing: border-box;
  flex: 1 1 0;
  min-width: 0;
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

  ${({ $tone }) =>
    $tone &&
    css`
      background: var(--c-${$tone}-soft);
      border-color: var(--c-${$tone});
    `}
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

  .ant-dropdown-menu-item.current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-weight: 600;
    color: var(--c-header-accent);
  }
`;

const MaintenancePanel: FC<{ amrId: string }> = ({ amrId }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const { status, level, blocking } = useMaintenanceStatus(amrId);
  const maintenanceMutation = useUpdateMaintenance(amrId, messageApi);

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
        {items.map((item: any) => {
          const isCurrent = item!.key === level?.toString();
          return (
            <div
              key={item!.key}
              className={`ant-dropdown-menu-item${isCurrent ? " current" : ""}`}
              onClick={() => onClick({ key: item!.key as string } as any)}
            >
              {item!.label}
              {isCurrent && <CheckOutlined />}
            </div>
          );
        })}
      </div>
    </StyledDropdownMenu>
  );

  return (
    <>
      {contextHolder}
      <PanelRow>
        <Dropdown
          menu={{ items, onClick }}
          trigger={["click"]}
          placement="bottom"
          popupRender={dropdownRender}
        >
          <IndustrialDropdown
            $tone={blocking ? alertTone(level) : undefined}
            title={
              blocking ? (t("maintenance.blocking_hint") as string) : undefined
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {blocking ? (
                <WarningFilled className="icon" />
              ) : (
                <ToolOutlined className="icon" />
              )}
              {/* 顯示目前的車況,還沒收到資料時才退回原本的「更新車輛狀態」 */}
              <span>{status || t("maintenance.update")}</span>
            </div>
            <DownOutlined className="arrow" />
          </IndustrialDropdown>
        </Dropdown>
        {blocking && (
          <RestoreButton
            type="button"
            onClick={() =>
              maintenanceMutation.mutate(MaintenanceLevel.NORMAL.toString())
            }
          >
            <CheckOutlined />
            {t("maintenance.restore_normal")}
          </RestoreButton>
        )}
      </PanelRow>
    </>
  );
};

// ======= 車輛卡片上的車況警示 =======

const AlertBar = styled.div<{ $tone: AlertTone }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-bottom: 1px solid var(--c-${({ $tone }) => $tone});
  background: var(--c-${({ $tone }) => $tone}-soft);
  font-size: 12px;
  line-height: 1.5;
  cursor: default;

  .anticon {
    flex-shrink: 0;
    color: var(--c-${({ $tone }) => $tone});
  }
`;

const AlertText = styled.span`
  flex: 1 1 0;
  min-width: 0;
  font-weight: 600;
  color: var(--c-text);
  overflow-wrap: anywhere;
`;

const AlertAction = styled.button`
  all: unset;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid var(--c-border-strong);
  border-radius: 2px;
  background: var(--c-bg);
  color: var(--c-text);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 1px;
  }
`;

/**
 * 車況不是「正常」時橫在卡片上的警示列,附一顆「恢復正常」。
 * 車況正常、離線、或還沒收到資料時不佔位置。
 */
export const MaintenanceAlert: FC<{ amrId: string }> = memo(({ amrId }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const { isOverdue } = useIsLogIn(amrId);
  const { status, level, blocking } = useMaintenanceStatus(amrId);
  const maintenanceMutation = useUpdateMaintenance(amrId, messageApi);

  if (isOverdue || !blocking) return <>{contextHolder}</>;

  return (
    <>
      {contextHolder}
      {/* 卡片本身點了會開操作選單,警示列上的點擊不要往上傳 */}
      <AlertBar
        $tone={alertTone(level)}
        title={t("maintenance.blocking_hint") as string}
        onClick={(e) => e.stopPropagation()}
      >
        <WarningFilled />
        <AlertText>{`${t("utils.maintenance_level")}: ${status}`}</AlertText>
        <Popconfirm
          title={t("maintenance.restore_confirm")}
          okText={t("maintenance.restore_normal")}
          onConfirm={() =>
            maintenanceMutation.mutate(MaintenanceLevel.NORMAL.toString())
          }
          onPopupClick={(e) => e.stopPropagation()}
        >
          <AlertAction type="button">
            {t("maintenance.restore_normal")}
          </AlertAction>
        </Popconfirm>
      </AlertBar>
    </>
  );
});

const BadgeWrap = styled.span<{ $tone: AlertTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  font-size: 12px;
  color: var(--c-${({ $tone }) => $tone});
`;

/** 最小化卡片放不下警示列,改在標題列亮一個圖示 */
export const MaintenanceBadge: FC<{ amrId: string }> = memo(({ amrId }) => {
  const { t } = useTranslation();
  const { isOverdue } = useIsLogIn(amrId);
  const { status, level, blocking } = useMaintenanceStatus(amrId);

  if (isOverdue || !blocking) return null;

  return (
    <BadgeWrap
      $tone={alertTone(level)}
      title={`${t("utils.maintenance_level")}: ${status}`}
    >
      <ToolOutlined />
    </BadgeWrap>
  );
});

export default MaintenancePanel;
