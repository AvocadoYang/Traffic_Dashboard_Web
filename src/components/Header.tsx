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
  Segmented,
} from "antd";
import "./component.css";
import { useLocation, useNavigate } from "react-router-dom";
import { memo, useEffect, useState } from "react";
import {
  MenuOutlined,
  UserOutlined,
  PoweroffOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AmrFilterCarCard, centerMap, Scale } from "@/utils/gloable";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import useName from "@/api/useAmrName";
import StartSimModal from "@/pages/SimulateResult/StartSimModal";
import { useMockInfo } from "@/sockets/useMockInfo";
import styled from "styled-components";
import { mq } from "@/styles/responsive";
import { useTimelineSocket } from "@/sockets/useTimelineSocket";
import dayjs from "dayjs";
import MissionBtn from "@/pages/Main/components/WebView/components/MissionBtn";
import HaStatusWidget from "@/pages/Main/components/HaStatusWidget";
import ChangePasswordModal from "./ChangePasswordModal";
import CreateUserModel from "./CreateUserModel";
import { jwtDecode } from "jwt-decode";
import SimTime from "./SimTime";
import DirectMove from "@/pages/Main/components/missionModal/DirectMove";
import ZoomPad from "@/pages/Main/components/WebView/components/ZoomPad";
import useMap from "@/api/useMap";
import { headerNavItemBase, headerNavItemActive } from "@/styles/headerNavItemStyle";

const { Header: AntdHeader } = Layout;

const IndustrialHeader = styled(AntdHeader)`
  && {
    background: var(--c-header-bg);
    /* border-bottom: 3px solid var(--c-header-accent); */
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--header-padding-x);
    height: var(--header-height);
    line-height: var(--header-height);
    //box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    position: relative;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 1px;
    // background: linear-gradient(90deg, transparent, var(--c-header-accent), transparent);
  }
`;

const CompactBar = styled(Flex)`
  display: flex;

  ${mq.web} {
    display: none;
  }
`;

const DesktopBar = styled.div`
  display: none;

  ${mq.web} {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: var(--space-md);
  }
`;

// HaStatusWidget/MissionBtn/模擬控制/語言切換/頭像這一整排,內容量會隨功能增加
// (例如 HA 開啟時多出兩個 Tag + 按鈕)超出可視寬度。原本沒有 min-width:0,
// flex-shrink 對這個 flex item 不生效(預設 min-width:auto 讓它撐開),
// 於是右側的語言切換/頭像被擠到看不到的地方,中間留一片空白。
// 這裡讓它可以真的縮小、縮不下的部分改成自己橫向捲動,不去擠壓整條 header。
const ActionsBar = styled(Flex)`
  min-width: 0;
  flex-shrink: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  > * {
    flex-shrink: 0;
  }
`;

// 導覽選單跟 HA/任務工具列不再同時擠在同一排,改成一次只顯示一排,
// 用這顆切換要看哪一排,兩排都用不到的空間就還給彼此。
const RowSwitch = styled(Segmented)`
  flex-shrink: 0;
`;

const IndustrialMenu = styled(Menu)`
  /* .ant-menu root 的 antd 規則為 10 */
  && {
    background: transparent;
    border: none;
    font-family: "Roboto Mono", monospace;
    flex: 1;
    min-width: 0;
  }

  /* horizontal 模式下 antd 對 item 的規則最高到 40
     （.ant-menu-light.ant-menu-horizontal > .ant-menu-item… 設 background-color），
     所以這裡必須 &&&& = 50；&& 只有 30 會被蓋掉。 */
  &&&& .ant-menu-item {
    ${headerNavItemBase}

    &.ant-menu-item-selected {
      ${headerNavItemActive}
    }
  }
`;

const SimulationStatus = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  /* background: var(--c-danger-soft); */
  /* border: 2px solid var(--c-danger); */
  /* border-left: 4px solid var(--c-danger); */
  font-family: "Roboto Mono", monospace;
  box-shadow: inset 0 0 20px rgba(255, 77, 79, 0.05);

  .anticon {
    font-size: var(--icon-size);
  }
`;

const StatusLabel = styled.span`
  font-size: var(--font-xs);
  color: var(--c-danger);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
`;

const ControlButton = styled(Button)`
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  color: var(--c-header-text);
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: var(--font-xs);
  letter-spacing: 1px;
  height: var(--control-height);
  padding: 0 var(--control-padding-x);
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  .anticon {
    font-size: var(--icon-size);
  }

  svg {
    width: var(--icon-size);
    height: var(--icon-size);
  }

  &:hover {
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
  }

  &.danger {
    border-color: var(--c-danger);
    color: var(--c-danger);

    &:hover {
      background: var(--c-danger-soft);
      border-color: var(--c-danger);
      color: var(--c-danger);
    }
  }

  &.simulate-active {
    background: var(--c-danger-soft);
    border-color: var(--c-danger);
    color: var(--c-danger);
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
  && {
    /* 讓 antd 自己的垂直置中 padding 跟著我們的高度重算 */
    --select-height: var(--control-height);

    width: var(--select-width);
    height: var(--control-height);
    background: var(--c-bg);
    border: 1px solid var(--c-header-border);
    border-radius: 0;
    color: var(--c-header-text);
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
    font-size: var(--font-xs);
    letter-spacing: 1px;

    &:hover {
      border-color: var(--c-header-accent);
      background: var(--c-header-accent-soft);
      color: var(--c-header-accent);
    }

    &.ant-select-focused {
      border-color: var(--c-header-accent);
      box-shadow: 0 0 0 2px var(--c-header-accent-soft);
    }
  }

  && .ant-select-suffix {
    color: var(--c-header-text);
  }
`;

const IndustrialDrawer = styled(Drawer)`
  && {
    background: var(--c-bg-subtle);
  }

  && .ant-drawer-header {
    background: var(--c-bg);
    border-bottom: 2px solid var(--c-header-border);
    border-left: 4px solid var(--c-header-accent);
  }

  && .ant-drawer-title {
    color: var(--c-header-accent);
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 700;
  }

  && .ant-drawer-body {
    padding: 0;
  }
`;

const MobileMenu = styled(Menu)`
  && {
    background: var(--c-bg-subtle);
    border: none;
    font-family: "Roboto Mono", monospace;
  }

  /* vertical 模式下 antd 對 item 的規則為 20（.ant-menu-light .ant-menu-item），
     && = 30 就夠。 */
  && .ant-menu-item {
    color: var(--c-header-text);
    font-size: var(--font-md);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: var(--space-xs) var(--space-sm);
    transition: all 0.2s;
    background: var(--c-bg);
    border: 1px solid var(--c-header-border);
    border-left: 3px solid transparent;

    &:hover {
      color: var(--c-header-accent);
      background: var(--c-header-accent-soft);
      border-color: var(--c-header-accent);
      border-left-color: var(--c-header-accent);
    }

    &.ant-menu-item-selected {
      color: var(--c-header-accent);
      background: var(--c-header-accent-soft);
      border-color: var(--c-header-accent);
      border-left-color: var(--c-header-accent);
    }
  }
`;

const UserAvatar = styled(Avatar)`
  && {
    width: var(--avatar-size);
    height: var(--avatar-size);
    line-height: var(--avatar-size);
    font-size: var(--font-md);
    cursor: pointer;
  }
`;

const MapOverlay = styled.div`
  display: contents;
  ${mq.web} {
    display: none;
  }
`;

const token = localStorage.getItem("token");
const username = token ? jwtDecode<{ username: string }>(token).username : "";

type HeaderRow = "nav" | "tools";
const HEADER_ROW_KEY = "headerActiveRow";

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [canSim, setCanSim] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hintAmrId, setHintAmrId] = useAtom(AmrFilterCarCard);
  const script = useMockInfo();
  const [headerRow, setHeaderRow] = useState<HeaderRow>(
    () => (localStorage.getItem(HEADER_ROW_KEY) as HeaderRow) || "nav",
  );

  useEffect(() => {
    localStorage.setItem(HEADER_ROW_KEY, headerRow);
  }, [headerRow]);

  const { refetch: amrNameRefetch } = useName();
  const [messageApi, contextHolder] = message.useMessage();
  const location = useLocation();
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const currentMapInfo = useMap();
  const setScale = useSetAtom(Scale);
  const cm = useAtomValue(centerMap);

  const mapScale = currentMapInfo?.data?.scale;
  useEffect(() => {
    if (mapScale === undefined) return;
    setScale(mapScale);
  }, [mapScale, cm, setScale]);

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
    runningScale: number,
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
    `${t("page_record")}`,
    `${t("page_mission_dispatch")}`,
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
        // 設定頁已經正式改用 v2;舊版還留在 /setting-v1,/setting 會轉過去
        navigate("/setting-v2");
        break;
      case "5":
        navigate("/simulate");
        break;
      case "6":
        navigate("/simulate-result");
        break;
      case "7":
        navigate("/records");
        break;
      case "8":
        navigate("/mission-dispatch");
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
      (v) => v.script_placement_location !== "unset",
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

        <CompactBar gap="middle" align="center">
          <MapOverlay>
            <ZoomPad></ZoomPad>
            {/* <MissionBtn></MissionBtn> */}
            <DirectMove></DirectMove>
            {/* <ECS_online />
                      <ElevatorIO />
                      <CorningTest></CorningTest>
                      <TestBarcode /> */}
          </MapOverlay>
          <IndustrialSelect
            value={i18n.language === "en" ? "en" : "ch.tw"}
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
        </CompactBar>

        <IndustrialDrawer
          title="Navigation"
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
        >
          <MobileMenu mode="vertical" items={items} onClick={handleMenuClick} />
          <UserAvatar icon={<UserOutlined />} />
        </IndustrialDrawer>

        <DesktopBar>
          <Tooltip title={t("header.switch_row")}>
            <RowSwitch
              size="small"
              value={headerRow}
              onChange={(v) => setHeaderRow(v as HeaderRow)}
              options={[
                { value: "nav", icon: <AppstoreOutlined /> },
                { value: "tools", icon: <ToolOutlined /> },
              ]}
            />
          </Tooltip>

          {headerRow === "nav" && (
            <IndustrialMenu
              mode="horizontal"
              items={items}
              onClick={handleMenuClick}
            />
          )}

          {headerRow === "tools" && (
            <ActionsBar gap="middle" align="center">
              {location.pathname === "/" && <HaStatusWidget />}
              {location.pathname === "/" && <MissionBtn />}
            </ActionsBar>
          )}

          <Flex
            gap="middle"
            align="center"
            style={{ flexShrink: 0, marginLeft: "auto" }}
          >
            {script?.isSimulate ? (
              <SimulationStatus>
                <ClockCircleOutlined />
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
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z" />
                    </svg>
                  }
                >
                  SIMULATE
                </ControlButton>
              </Tooltip>
            )}

            <IndustrialSelect
              value={i18n.language === "en" ? "en" : "ch.tw"}
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
              <UserAvatar icon={<UserOutlined />} shape="square"></UserAvatar>
            </Dropdown>
          </Flex>
        </DesktopBar>
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
