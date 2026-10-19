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
  Dropdown,
  Badge,
  Space,
  type MenuProps,
} from "antd";
import "./component.css";
import { useLocation, useNavigate } from "react-router-dom";
import { memo, useEffect, useState } from "react";
import {
  MenuOutlined,
  SettingOutlined,
  MessageOutlined,
  DesktopOutlined,
  LogoutOutlined,
  PoweroffOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AmrFilterCarCard, centerMap, Scale } from "@/utils/gloable";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import useName from "@/api/useAmrName";
import StartSimModal from "@/components/StartSimModal";
import useUiConfig from "@/api/useUiConfig";
import { useMockInfo } from "@/sockets/useMockInfo";
import styled from "styled-components";
import { mq } from "@/styles/responsive";
import dayjs from "dayjs";
import MissionBtn from "@/pages/Main/components/WebView/components/MissionBtn";
import HaStatusWidget from "@/pages/Main/components/HaStatusWidget";
import ClientNameModal from "./ClientNameModal";
import { getClientName } from "@/utils/clientIdentity";
import { UserAvatar as ProfileAvatar } from "@/components/UserAvatar/UserAvatar";
import { useMyProfile, useShiftNotes } from "@/api/useProfile";
import { getToken, logout, tokenAccount } from "@/utils/session";
import SimTime from "./SimTime";
import DirectMove from "@/pages/Main/components/missionModal/DirectMove";
import ZoomPad from "@/pages/Main/components/WebView/components/ZoomPad";
import useMap from "@/api/useMap";
import {
  headerNavItemBase,
  headerNavItemActive,
} from "@/styles/headerNavItemStyle";

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
// 用這組分頁切換要看哪一排,兩排都用不到的空間就還給彼此。
//
// 原本是一顆只有兩個小圖示的 Segmented:目標太小不好點,也看不出哪個圖示是什麼。
// 改成兩個有字的分頁,而且整條 header 的高度都點得到(見 RowTab 的 ::before)。
const RowTabs = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  align-items: stretch;
  height: var(--control-height);
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-header-border);
  border-radius: 4px;
`;

const RowTab = styled.button<{ $active: boolean }>`
  all: unset;
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 var(--space-md);
  font-family: "Roboto Mono", monospace;
  font-size: var(--font-sm);
  font-weight: 600;
  /* header 本身的 line-height 是整條的高度,不重設的話字會被撐到框外 */
  line-height: 1;
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active }) =>
    $active ? "var(--c-header-accent)" : "var(--c-header-text)"};
  background: ${({ $active }) =>
    $active ? "var(--c-header-accent-soft)" : "transparent"};
  /* 跟導覽項目選中時一樣,底下一條強調色 */
  box-shadow: ${({ $active }) =>
    $active ? "inset 0 -2px 0 var(--c-header-accent)" : "none"};
  transition:
    color 0.2s,
    background 0.2s;

  & + & {
    border-left: 1px solid var(--c-header-border);
  }

  .anticon {
    font-size: var(--icon-size);
  }

  /* 看起來只有一般控制項那麼高,但可以點的範圍往上下延伸到整條 header,
     滑鼠甩到畫面最上緣也點得到 */
  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: calc((var(--control-height) - var(--header-height)) / 2);
    bottom: calc((var(--control-height) - var(--header-height)) / 2);
  }

  &:hover {
    color: var(--c-header-accent);
    background: var(--c-header-accent-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
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

const UserButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const UserMenuHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  color: var(--c-text);

  strong {
    display: block;
    font-size: var(--font-md);
  }
  small {
    display: block;
    color: var(--c-text-secondary);
  }
`;

const MapOverlay = styled.div`
  display: contents;
  ${mq.web} {
    display: none;
  }
`;


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
  // 實際案場 (YAML SHOW_SIMULATION_UI: false) 不顯示「模擬」按鈕;
  // 模擬正在跑時照樣顯示「停止模擬」和模擬時間, 才停得掉
  // 「任務模擬 v2」選單也一樣看 YAML (SHOW_SIMULATE_V2)
  const { showSimulationUi, showSimulateV2 } = useUiConfig();
  // 任務列(HA 狀態 / 任務派發)只有首頁才有內容。其他頁面一律顯示導覽、也不給切換,
  // 不然上次停在任務列的人換到別頁會看到一排空白,連導覽都不見。
  const hasToolsRow =
    location.pathname === "/" || location.pathname === "/main-v1";
  const activeRow: HeaderRow = hasToolsRow ? headerRow : "nav";
  const [openClientName, setOpenClientName] = useState(false);
  const [clientName, setClientNameState] = useState(getClientName);
  const username = tokenAccount(getToken());
  const { data: profile } = useMyProfile();
  const { data: shiftNotes } = useShiftNotes();
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

  // key 就是網址; 依 YAML 藏掉的項目直接不放, 其他項目不受影響
  const items = [
    { key: "/", label: t("page_view") },
    { key: "/amr", label: t("page_amr") },
    { key: "/cargo-history", label: t("page_cargo_history") },
    // 設定頁已經正式改用 v3;舊版還留在 /setting-v2、/setting-v1,/setting 會轉過去
    { key: "/setting-v3", label: t("page_setting") },
    // 任務模擬 v2: 自己畫佈局、算運能。舊的任務模擬頁拿掉了,
    // 放模擬車改在首頁地圖的「模擬車輛」
    ...(showSimulateV2
      ? [{ key: "/simulate-v2", label: t("page_simulate_v2") }]
      : []),
    { key: "/records", label: t("page_record") },
    { key: "/mission-dispatch", label: t("page_mission_dispatch") },
    { key: "/report", label: t("page_report") },
  ];

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
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
      case "profile":
        navigate("/profile");
        break;
      case "shift":
        navigate("/profile?tab=shift");
        break;
      case "client-name":
        setOpenClientName(true);
        break;
      case "logout":
        logout();
        break;
      default:
        break;
    }
  };

  const unreadNotes = shiftNotes?.unread ?? 0;
  const menuProps: MenuProps = {
    items: [
      {
        key: "me",
        disabled: true,
        style: { cursor: "default" },
        label: (
          <UserMenuHead>
            <ProfileAvatar avatar={profile?.avatar} account={username} size={36} />
            <div>
              <strong>{username}</strong>
              {profile && <small>{t(`profile.role.${profile.role}`)}</small>}
            </div>
          </UserMenuHead>
        ),
      },
      { type: "divider" },
      { key: "profile", icon: <SettingOutlined />, label: t("profile.title") },
      {
        key: "shift",
        icon: <MessageOutlined />,
        label: (
          <Space size={6}>
            {t("profile.tab.shift")}
            {unreadNotes > 0 && <Badge count={unreadNotes} size="small" />}
          </Space>
        ),
      },
      {
        key: "client-name",
        icon: <DesktopOutlined />,
        label: `${t("client_name.title")}: ${clientName || t("client_name.unset")}`,
      },
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, danger: true, label: t("profile.logout") },
    ],
    onClick: handleUserMenuClick,
  };

  const userButton = (
    <Dropdown menu={menuProps} placement="bottomRight" trigger={["click"]}>
      <UserButton type="button" aria-label={t("profile.title")}>
        <Badge count={unreadNotes} size="small" offset={[-2, 2]}>
          <ProfileAvatar avatar={profile?.avatar} account={username} size={30} />
        </Badge>
      </UserButton>
    </Dropdown>
  );

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
          title={t("header.navigation")}
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
        >
          <MobileMenu mode="vertical" items={items} onClick={handleMenuClick} />
          {userButton}
        </IndustrialDrawer>

        <DesktopBar>
          {hasToolsRow && (
            <RowTabs role="tablist" aria-label={t("header.switch_row")}>
              <RowTab
                type="button"
                role="tab"
                aria-selected={activeRow === "nav"}
                $active={activeRow === "nav"}
                onClick={() => setHeaderRow("nav")}
              >
                <AppstoreOutlined />
                {t("header.navigation")}
              </RowTab>
              <RowTab
                type="button"
                role="tab"
                aria-selected={activeRow === "tools"}
                $active={activeRow === "tools"}
                onClick={() => setHeaderRow("tools")}
              >
                <SendOutlined />
                {t("main.card_name.mission")}
              </RowTab>
            </RowTabs>
          )}

          {activeRow === "nav" && (
            <IndustrialMenu
              mode="horizontal"
              items={items}
              onClick={handleMenuClick}
            />
          )}

          {activeRow === "tools" && (
            <ActionsBar gap="middle" align="center">
              <HaStatusWidget />
              <MissionBtn />
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
                <StatusLabel>{t("header.sim_time")}</StatusLabel>
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
                  {t("header.stop_sim")}
                </ControlButton>
              </Tooltip>
            ) : showSimulationUi ? (
              <Tooltip title={t("page_simulate")}>
                <ControlButton
                  onClick={() => setIsSimulateOpen(true)}
                  icon={
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z" />
                    </svg>
                  }
                >
                  {t("header.simulate")}
                </ControlButton>
              </Tooltip>
            ) : null}

            <IndustrialSelect
              value={i18n.language === "en" ? "en" : "ch.tw"}
              onChange={(e) => handleChineseItemClick(e as any)}
              options={[
                { value: "en", label: "EN" },
                { value: "ch.tw", label: "中文" },
              ]}
            />

            {userButton}
          </Flex>
        </DesktopBar>
      </IndustrialHeader>

      <StartSimModal
        isSimulateOpen={isSimulateOpen}
        canSim={canSim}
        handleSim={handleSim}
        setIsSimulateOpen={setIsSimulateOpen}
      />

      <ClientNameModal
        open={openClientName}
        setOpen={setOpenClientName}
        onSaved={setClientNameState}
      />
    </>
  );
};

export default memo(Header);
