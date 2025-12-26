/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  Layout,
  Menu,
  Flex,
  Button,
  Drawer,
  message,
  Tooltip,
  Select,
  Avatar,
  Dropdown,
} from "antd";
import "./component.css";
import { useLocation, useNavigate } from "react-router-dom";
import { memo, useEffect, useState } from "react";
import {
  MenuOutlined,
  UserOutlined,
  PoweroffOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import { AmrFilterCarCard, darkMode } from "@/utils/gloable";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import useName from "@/api/useAmrName";
import StartSimModal from "@/pages/SimulateResult/StartSimModal";
import { useMockInfo } from "@/sockets/useMockInfo";
import styled from "styled-components";
import { useTimelineSocket } from "@/sockets/useTimelineSocket";
import dayjs from "dayjs";
import MissionBtn from "@/pages/Main/components/WebView/components/MissionBtn";
import ChangePasswordModal from "./ChangePasswordModal";
import CreateUserModel from "./CreateUserModel";
import { jwtDecode } from "jwt-decode";
import SimTime from "./SimTime";

const { Header: AntdHeader } = Layout;

// Industrial Header Styling - Light Mode
const IndustrialHeader = styled(AntdHeader)`
  background: #ffffff !important;
  /* border-bottom: 3px solid #1890ff; */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px !important;
  height: 64px;
  //box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 1px;
    // background: linear-gradient(90deg, transparent, #1890ff, transparent);
  }
`;

const IndustrialMenu = styled(Menu)`
  background: transparent !important;
  border: none !important;
  font-family: "Roboto Mono", monospace;

  .ant-menu-item {
    color: #595959 !important;
    font-size: 11px !important;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
    border-bottom: 3px solid transparent;
    margin: 0 4px;
    padding: 0 16px;
    height: 64px;
    line-height: 64px;
    transition: all 0.2s;

    &:hover {
      color: #1890ff !important;
      background: rgba(24, 144, 255, 0.05) !important;
      border-bottom-color: #1890ff;
    }

    &.ant-menu-item-selected {
      color: #1890ff !important;
      background: rgba(24, 144, 255, 0.08) !important;
      border-bottom-color: #1890ff;
      box-shadow: inset 0 -3px 0 #1890ff;
    }
  }
`;

const SimulationStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  /* background: #fff1f0; */
  /* border: 2px solid #ff4d4f; */
  /* border-left: 4px solid #ff4d4f; */
  font-family: "Roboto Mono", monospace;
  box-shadow: inset 0 0 20px rgba(255, 77, 79, 0.05);
`;

const StatusLabel = styled.span`
  font-size: 10px;
  color: #ff4d4f;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
`;

const ControlButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #595959;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.danger {
    border-color: #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  }

  &.simulate-active {
    background: #fff1f0;
    border-color: #ff4d4f;
    color: #ff4d4f;
    animation: pulse 2s ease-in-out infinite;
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
`;

const IndustrialSelect = styled(Select)`
  .ant-select-selector {
    background: #ffffff !important;
    border: 1px solid #d9d9d9 !important;
    color: #595959 !important;
    font-family: "Roboto Mono", monospace !important;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 1px;
    height: 36px !important;
    border-radius: 0 !important;

    &:hover {
      border-color: #1890ff !important;
      background: #f0f5ff !important;
      color: #1890ff !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #1890ff !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1) !important;
  }

  .ant-select-arrow {
    color: #595959;
  }
`;

const IndustrialDrawer = styled(Drawer)`
  .ant-drawer-content {
    background: #fafafa;
  }

  .ant-drawer-header {
    background: #ffffff;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #1890ff;
  }

  .ant-drawer-title {
    color: #1890ff;
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 700;
  }

  .ant-drawer-body {
    padding: 0;
  }
`;

const MobileMenu = styled(Menu)`
  background: #fafafa !important;
  border: none !important;
  font-family: "Roboto Mono", monospace;

  .ant-menu-item {
    color: #595959 !important;
    font-size: 12px !important;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 4px 8px !important;
    border-left: 3px solid transparent;
    transition: all 0.2s;
    background: #ffffff !important;
    border: 1px solid #d9d9d9 !important;
    border-left: 3px solid transparent !important;

    &:hover {
      color: #1890ff !important;
      background: #f0f5ff !important;
      border-left-color: #1890ff !important;
      border-color: #1890ff !important;
    }

    &.ant-menu-item-selected {
      color: #1890ff !important;
      background: #e6f7ff !important;
      border-left-color: #1890ff !important;
      border-color: #1890ff !important;
      box-shadow: inset 0 0 20px rgba(24, 144, 255, 0.08);
    }
  }
`;
const token = localStorage.getItem("token");
const username = token ? jwtDecode<{ username: string }>(token).username : "";

const Header: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isDark] = useAtom(darkMode);
  const [canSim, setCanSim] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hintAmrId, setHintAmrId] = useAtom(AmrFilterCarCard);
  const script = useMockInfo();

  const { refetch: amrNameRefetch } = useName();
  const [messageApi, contextHolder] = message.useMessage();
  const location = useLocation();
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openCreateUser, setOpenCreateUser] = useState(false);

  const simMutation = useMutation({
    mutationFn: (data: {
      isSimulate: boolean;
      startTime: string;
      endTime: string;
      runningScale: number;
      activeStationTask: boolean;
    }) => {
      return client.post("api/simulate/simulate", data);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      amrNameRefetch();
      setIsSimulateOpen(false);
      if (!hintAmrId.size) {
        return;
      }
      setHintAmrId((pre) => {
        pre.clear();
        return new Set([...pre]);
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleSim = (
    timeRange: [dayjs.Dayjs, dayjs.Dayjs],
    activeStationTask: boolean,
    runningScale: number
  ) => {
    const startTime = timeRange[0].format("HH:mm");
    const endTime = timeRange[1].format("HH:mm");

    simMutation.mutate({
      startTime,
      endTime,
      runningScale,
      isSimulate: true,
      activeStationTask,
    });
  };

  const handleAbortSim = () => {
    simMutation.mutate({
      isSimulate: false,
      startTime: "00:00",
      endTime: "00:00",
      runningScale: 1,
      activeStationTask: false,
    });
  };

  const items = [
    `${t("page_view")}`,
    `${t("page_amr")}`,
    `${t("page_cargo_history")}`,
    `${t("page_setting")}`,
    `${t("page_simulate")}`,
    `${t("page_simulate_result")}`,
  ].map((name, index) => ({
    key: index + 1,
    label: name,
  }));

  const handleMenuClick = (e: { key: string }) => {
    switch (e.key) {
      case "1":
        navigate("/");
        break;
      case "2":
        navigate("/amr");
        break;
      case "3":
        navigate("/cargo-history");
        break;
      case "4":
        navigate("/setting");
        break;
      case "5":
        navigate("/simulate");
        break;
      case "6":
        navigate("/simulate-result");
        break;
      default:
        break;
    }
  };

  const handleChineseItemClick = (value: string) => {
    if (value === "en") {
      void i18n.changeLanguage("en");
    } else {
      void i18n.changeLanguage("tw");
    }
  };

  useEffect(() => {
    if (!script) return;
    const inUseAmr = script.robot?.filter(
      (v) => v.script_placement_location !== "unset"
    );

    if (inUseAmr?.length !== 0) {
      setCanSim(true);
      return;
    }

    setCanSim(false);
  }, [script]);

  const handleUserMenuClick = (e: { key: string }) => {
    switch (e.key) {
      case "2":
        localStorage.removeItem("token");
        navigate("/login");
        break;
      case "3":
        setOpenChangePassword(true);
        break;
      case "4":
        setOpenCreateUser(true);
        break;
      default:
        break;
    }
  };

  const userItems = [
    `HI 👋 ${username}`,
    ` logout`,
    `change password`,
    `create user`,
  ].map((name, index) => ({
    key: index + 1,
    label: name,
  }));

  const menuProps = {
    items: userItems,
    onClick: handleUserMenuClick,
  };

  return (
    <>
      {contextHolder}
      <IndustrialHeader>
        <div onClick={() => navigate("/")} className="demo-logo"></div>
        {isMobile ? (
          <>
            <Flex gap="middle" align="center">
              <IndustrialSelect
                defaultValue="ch.tw"
                style={{ width: 100 }}
                onChange={(e) => handleChineseItemClick(e as any)}
                options={[
                  { value: "en", label: "EN" },
                  { value: "ch.tw", label: "中文" },
                ]}
              />
              <ControlButton
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
            </Flex>

            <IndustrialDrawer
              title="Navigation"
              placement="left"
              onClose={() => setDrawerOpen(false)}
              open={drawerOpen}
              width={280}
            >
              <MobileMenu
                mode="vertical"
                items={items}
                onClick={handleMenuClick}
              />
              <Avatar size={32} icon={<UserOutlined />} />
            </IndustrialDrawer>
          </>
        ) : (
          <>
            <IndustrialMenu
              mode="horizontal"
              items={items}
              style={{ flex: 1, minWidth: 0, border: "none" }}
              onClick={handleMenuClick}
            />

            <Flex gap="middle" align="center">
              {location.pathname === "/" && <MissionBtn />}

              {script?.isSimulate ? (
                <SimulationStatus>
                  <ClockCircleOutlined style={{ fontSize: 16 }} />
                  <StatusLabel>SIM TIME</StatusLabel>
                  <SimTime></SimTime>
                </SimulationStatus>
              ) : null}

              {script?.isSimulate ? (
                <Tooltip title={t("sim.start_sim_modal.inactive_sim")}>
                  <ControlButton
                    className="danger simulate-active"
                    onClick={handleAbortSim}
                    icon={<PoweroffOutlined />}
                  >
                    STOP SIM
                  </ControlButton>
                </Tooltip>
              ) : (
                <Tooltip title={t("page_simulate")}>
                  <ControlButton
                    onClick={() => setIsSimulateOpen(true)}
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z" />
                      </svg>
                    }
                  >
                    SIMULATE
                  </ControlButton>
                </Tooltip>
              )}

              <IndustrialSelect
                defaultValue="ch.tw"
                style={{ width: 100 }}
                onChange={(e) => handleChineseItemClick(e as any)}
                options={[
                  { value: "en", label: "EN" },
                  { value: "ch.tw", label: "中文" },
                ]}
              />

              <Dropdown
                menu={menuProps}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  style={{ cursor: "pointer" }}
                  shape="square"
                ></Avatar>
              </Dropdown>
            </Flex>
          </>
        )}
      </IndustrialHeader>

      <StartSimModal
        isSimulateOpen={isSimulateOpen}
        canSim={canSim}
        handleSim={handleSim}
        setIsSimulateOpen={setIsSimulateOpen}
      />

      <ChangePasswordModal
        open={openChangePassword}
        setOpen={setOpenChangePassword}
      ></ChangePasswordModal>

      <CreateUserModel open={openCreateUser} setOpen={setOpenCreateUser} />
    </>
  );
};

export default memo(Header);
