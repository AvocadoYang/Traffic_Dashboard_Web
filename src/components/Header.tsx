/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { message } from "antd";
import BrandLogo from "./BrandLogo";
import { useLocation, useNavigate } from "react-router-dom";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  CloseOutlined,
  DownOutlined,
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
import styled, { css, keyframes } from "styled-components";
import { mq } from "@/styles/responsive";
import dayjs from "dayjs";
import MissionBtn from "@/pages/Main/components/WebView/components/MissionBtn";
import HaStatusWidget from "@/pages/Main/components/HaStatusWidget";
import ClientNameModal from "./ClientNameModal";
import { clientNameAtom } from "@/utils/clientIdentity";
import { UserAvatar as ProfileAvatar } from "@/components/UserAvatar/UserAvatar";
import { useMyProfile } from "@/api/useProfile";
import { pagePermissionOf, usePermission } from "@/utils/permissions";
import { chatOpenAtom, useSiteChat } from "@/api/useSiteChat";
import { getToken, logout, tokenAccount } from "@/utils/session";
import SimTime from "./SimTime";
import DirectMove from "@/pages/Main/components/missionModal/DirectMove";
import ZoomPad from "@/pages/Main/components/WebView/components/ZoomPad";
import useMap from "@/api/useMap";
import { applyNavPrefs } from "@/utils/headerNav";
import {
  headerNavItemBase,
  headerNavItemActive,
} from "@/styles/headerNavItemStyle";

/*
 * 標題列: 全部用 styled-components + 原生元素自己畫, 不用 antd 的 Layout / Menu / Select /
 * Dropdown / Drawer / Button。這樣樣式不用跟 antd 的規則比 specificity, 每個元件也少掉
 * 一整層 antd 的 runtime (cssinjs 算 token、rc-overflow 量寬度)。
 * (只剩 message: 任務模擬成功 / 失敗的提示條, 跟標題列的畫面無關。)
 */

// 字距: 介面字在小字級下要稍微拉開才好讀
const TRACK = "0.14em";
const TRACK_TIGHT = "0.1em";

const IndustrialHeader = styled.header`
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 var(--header-padding-x);
  background: var(--c-header-bg);
  color: var(--c-header-text);
  font-family: var(--font-ui);
  /* 下緣一條髮絲線 */
  box-shadow: inset 0 -1px 0 var(--c-header-border);

  /* 精品黑主題: 髮絲線中間帶一抹品牌紅 (跟登入頁的紅線呼應); 其他主題沒有, 見 styles/luxe.css */
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--header-line);
    pointer-events: none;
  }

  /* 全站是 * { 等寬字 }, 標題列裡一律跟著介面字 */
  & * {
    font-family: inherit;
  }
`;

const Logo = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding-right: var(--space-lg);
  color: var(--c-text);

  /* 手機寬度只留符號, 把空間讓給中間的縮放工具列 */
  .logo-mark {
    display: none;
  }
  @media (max-width: 520px) {
    padding-right: var(--space-sm);
    .logo-full {
      display: none;
    }
    .logo-mark {
      display: block;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: -2px;
  }
`;

const CompactBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-lg);
  flex: 1 1 auto;
  min-width: 0;

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
    height: 100%;
    gap: var(--space-md);
  }
`;

// MissionBtn / 模擬控制 / 語言切換 / 頭像這一整排內容量會隨功能增加。
// 讓它可以真的縮小、縮不下的部分改成自己橫向捲動, 不去擠壓整條 header。
const ActionsBar = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-lg);
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

const RightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex-shrink: 0;
  margin-left: auto;
`;

// 導覽 / 任務列一次只顯示一排, 用這組分頁切換。
// 看起來只有一般控制項那麼高, 但可以點的範圍往上下延伸到整條 header (RowTab 的 ::before)。
const RowTabs = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  align-items: stretch;
  height: var(--control-height);
  padding: 2px;
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-header-border);
`;

const RowTab = styled.button<{ $active: boolean }>`
  all: unset;
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 var(--space-md);
  font-family: var(--font-ui);
  font-size: var(--font-sm);
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.12em;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active }) =>
    $active ? "var(--c-text)" : "var(--c-header-text)"};
  background: ${({ $active }) =>
    $active ? "var(--c-bg-muted)" : "transparent"};
  box-shadow: ${({ $active }) =>
    $active ? "inset 0 0 0 1px var(--c-border-strong)" : "none"};
  transition:
    color 0.15s,
    background 0.15s;

  .anticon {
    font-size: var(--icon-size);
  }

  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: calc((var(--control-height) - var(--header-height)) / 2);
    bottom: calc((var(--control-height) - var(--header-height)) / 2);
  }

  &:hover {
    color: var(--c-text);
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

// 導覽列: 放不下的項目收進右邊的「更多」選單 (原本 antd 的選單會自動出現「…」, 自製版一度只把多的藏起來,
// 頁面就憑空消失了)。所有項目都先排進去量寬度, 放不下的設成 visibility: hidden (還佔位置才量得到),
// 「更多」按鈕疊在最右邊。
const NavShell = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
`;

const NavBar = styled.nav`
  height: 100%;
  display: flex;
  align-items: stretch;
  overflow: hidden;
`;

const NavMoreWrap = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: stretch;
  padding-left: var(--space-md);
  /* 左邊淡出, 蓋住被切到一半的項目 */
  background: linear-gradient(
    90deg,
    transparent,
    var(--c-header-bg) var(--space-md)
  );
`;

// 導覽項目的視覺規則跟 MissionBtn 共用 (styles/headerNavItemStyle.ts)
const NavItem = styled.button<{ $active: boolean; $hidden?: boolean }>`
  all: unset;
  box-sizing: border-box;
  flex-shrink: 0;
  white-space: nowrap;
  ${headerNavItemBase}
  ${({ $active }) => $active && headerNavItemActive}
  ${({ $hidden }) => $hidden && "visibility: hidden;"}

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: -2px;
  }
`;

const SimulationStatus = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  font-family: var(--font-ui);
  box-shadow: inset 0 0 20px rgba(255, 77, 79, 0.05);

  .anticon {
    font-size: var(--icon-size);
  }
`;

const StatusLabel = styled.span`
  font-size: var(--font-xs);
  color: var(--c-danger);
  text-transform: uppercase;
  letter-spacing: ${TRACK_TIGHT};
  font-weight: 700;
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(255, 77, 79, 0); }
`;

const controlBox = css`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: var(--control-height);
  padding: 0 var(--control-padding-x);
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  color: var(--c-header-text);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 600;
  line-height: 1;
  letter-spacing: ${TRACK_TIGHT};
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;

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

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const ControlButton = styled.button`
  all: unset;
  ${controlBox}
  text-transform: uppercase;

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
    animation: ${pulse} 2s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &.simulate-active {
      animation: none;
    }
  }
`;

const UserButton = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  border-radius: 50%;

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const UserMenuWrap = styled.div`
  position: relative;
  display: inline-flex;
`;

const Popover = styled.div`
  position: absolute;
  z-index: 1050;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  padding: 4px 0;
  background: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
`;

const MenuHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  color: var(--c-text);

  strong {
    display: block;
    font-size: var(--font-md);
    letter-spacing: 0.04em;
  }
  small {
    display: block;
    font-size: var(--font-xs);
    color: var(--c-text-secondary);
    letter-spacing: ${TRACK_TIGHT};
  }
`;

const MenuDivider = styled.div`
  height: 1px;
  margin: 4px 0;
  background: var(--c-border);
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 14px;
  font-size: var(--font-md);
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  color: ${({ $danger }) => ($danger ? "var(--c-danger)" : "var(--c-text)")};

  .anticon {
    font-size: var(--icon-size);
  }

  &:hover,
  &:focus-visible {
    background: ${({ $danger }) =>
      $danger ? "var(--c-danger-soft)" : "var(--c-bg-muted)"};
  }
`;

const CountBadge = styled.span`
  margin-left: auto;
  min-width: 18px;
  padding: 1px 5px;
  font-size: var(--font-xs);
  line-height: 1.4;
  text-align: center;
  color: var(--c-on-accent);
  background: var(--c-danger);
`;

// 窄螢幕的側邊選單 (原本是 antd Drawer)
const DrawerBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 0.2s;
`;

const DrawerPanel = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1001;
  width: min(80vw, 320px);
  display: flex;
  flex-direction: column;
  background: var(--c-bg-subtle);
  border-right: 1px solid var(--c-border-strong);
  transform: translateX(${({ $open }) => ($open ? "0" : "-100%")});
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
  transition:
    transform 0.2s,
    visibility 0.2s;
  font-family: var(--font-ui);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const DrawerHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-lg);
  background: var(--c-bg);
  border-bottom: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);

  h2 {
    margin: 0;
    font-size: var(--font-md);
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--c-header-accent);
  }
`;

const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-xs) 0 var(--space-lg);
`;

const DrawerNavItem = styled.button<{ $active: boolean }>`
  all: unset;
  box-sizing: border-box;
  display: block;
  width: calc(100% - var(--space-sm) * 2);
  margin: var(--space-xs) var(--space-sm);
  padding: 10px var(--space-md);
  font-size: var(--font-md);
  font-weight: 600;
  letter-spacing: ${TRACK_TIGHT};
  cursor: pointer;
  color: ${({ $active }) =>
    $active ? "var(--c-header-accent)" : "var(--c-header-text)"};
  background: ${({ $active }) =>
    $active ? "var(--c-header-accent-soft)" : "var(--c-bg)"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "var(--c-header-accent)" : "var(--c-header-border)"};
  border-left: 3px solid
    ${({ $active }) => ($active ? "var(--c-header-accent)" : "transparent")};

  &:hover,
  &:focus-visible {
    color: var(--c-header-accent);
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
  }
`;

const MapOverlay = styled.div`
  display: contents;
  ${mq.web} {
    display: none;
  }
`;

/** 點選單以外的地方或按 Esc 就關起來 */
const useDismiss = (open: boolean, onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
};

/**
 * 導覽列放得下幾個項目: 回傳「從第幾個開始放不下」(全部放得下就是項目總數)。
 * 項目都排在容器裡 (放不下的 visibility: hidden, 還佔位置), 量每個項目的右緣, 扣掉「更多」按鈕的寬度。
 */
const MORE_BTN_WIDTH = 96;
const useNavOverflow = (count: number, deps: unknown[]) => {
  const barRef = useRef<HTMLElement>(null);
  const [hiddenFrom, setHiddenFrom] = useState(count);

  const measure = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const kids = Array.from(
      bar.querySelectorAll<HTMLElement>("[data-nav-item]"),
    );
    if (!kids.length) return;
    const room = bar.clientWidth;
    const right = (el: HTMLElement) => el.offsetLeft + el.offsetWidth + 4; // 4 = 項目右邊的 margin
    if (right(kids[kids.length - 1]) <= room) {
      setHiddenFrom(kids.length);
      return;
    }
    const idx = kids.findIndex((el) => right(el) > room - MORE_BTN_WIDTH);
    setHiddenFrom(idx < 0 ? kids.length : idx);
  }, []);

  useLayoutEffect(() => {
    measure();
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    bar.querySelectorAll("[data-nav-item]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, count, ...deps]);

  return { barRef, hiddenFrom };
};

/** 目前所在頁: 首頁有兩個網址, 其他頁連子路徑都算 */
const isActivePath = (pathname: string, key: string) =>
  key === "/"
    ? pathname === "/" || pathname === "/main-v1"
    : pathname === key || pathname.startsWith(`${key}/`);

type HeaderRow = "nav" | "tools";
const HEADER_ROW_KEY = "headerActiveRow";

const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [canSim, setCanSim] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
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
  // 任務列(任務派發)只有首頁才有內容。其他頁面一律顯示導覽、也不給切換,
  // 不然上次停在任務列的人換到別頁會看到一排空白,連導覽都不見。
  const can = usePermission();
  // 沒有「派發任務」權限的帳號任務列整排都是空的, 也不給切
  const hasToolsRow =
    (location.pathname === "/" || location.pathname === "/main-v1") &&
    can("mission.dispatch");
  const activeRow: HeaderRow = hasToolsRow ? headerRow : "nav";
  const [openClientName, setOpenClientName] = useState(false);
  const [clientName, setClientNameState] = useAtom(clientNameAtom);
  const username = tokenAccount(getToken());
  const { data: profile } = useMyProfile();
  const { data: chat } = useSiteChat();
  const setChatOpen = useSetAtom(chatOpenAtom);
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
  const allItems = [
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
    { key: "/fleet-replay", label: t("page_fleet_replay") },
    { key: "/report", label: t("page_report") },
    { key: "/achievements", label: t("page_achievements") },
  ].filter((item) => {
    // 功能權限: 帳號沒有的頁面不放進選單
    const need = pagePermissionOf(item.key);
    return !need || can(need);
  });
  // 個人偏好: 順序與隱藏 (設定在 個人設定 > 偏好)
  const items = applyNavPrefs(allItems, profile?.preferences.nav);

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
      case "chat":
        setChatOpen(true);
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

  const unreadChat = chat?.unread ?? 0;
  const closeUser = useCallback(() => setUserOpen(false), []);
  const userRef = useDismiss(userOpen, closeUser);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const pathname = location.pathname;
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  const moreRef = useDismiss(moreOpen, closeMore);
  const { barRef, hiddenFrom } = useNavOverflow(items.length, [
    activeRow,
    items.map((i) => i.label).join("|"),
  ]);
  const hiddenItems = items.slice(hiddenFrom);
  const activeHidden = hiddenItems.some((i) => isActivePath(pathname, i.key));
  const goTo = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };
  const runUserAction = (key: string) => {
    setUserOpen(false);
    setDrawerOpen(false);
    handleUserMenuClick({ key });
  };
  const roleText = profile ? t(`profile.role.${profile.role}`) : "";
  const clientNameText = `${t("client_name.title")}: ${clientName || t("client_name.unset")}`;

  const userMenuItems = (
    <>
      <MenuItem
        type="button"
        role="menuitem"
        onClick={() => runUserAction("profile")}
      >
        <SettingOutlined />
        {t("profile.title")}
      </MenuItem>
      <MenuItem
        type="button"
        role="menuitem"
        onClick={() => runUserAction("chat")}
      >
        <MessageOutlined />
        {t("chat.menu")}
        {unreadChat > 0 && <CountBadge>{unreadChat}</CountBadge>}
      </MenuItem>
      <MenuItem
        type="button"
        role="menuitem"
        onClick={() => runUserAction("client-name")}
      >
        <DesktopOutlined />
        {clientNameText}
      </MenuItem>
      <MenuDivider />
      <MenuItem
        type="button"
        role="menuitem"
        $danger
        onClick={() => runUserAction("logout")}
      >
        <LogoutOutlined />
        {t("profile.logout")}
      </MenuItem>
    </>
  );

  const userHead = (
    <MenuHead>
      <ProfileAvatar avatar={profile?.avatar} account={username} size={36} />
      <div>
        <strong>{username}</strong>
        {profile && <small>{roleText}</small>}
      </div>
    </MenuHead>
  );

  const userMenu = (
    <UserMenuWrap ref={userRef}>
      <UserButton
        type="button"
        aria-label={t("profile.title")}
        aria-haspopup="menu"
        aria-expanded={userOpen}
        onClick={() => setUserOpen((v) => !v)}
      >
        <ProfileAvatar avatar={profile?.avatar} account={username} size={30} />
      </UserButton>
      {userOpen && (
        <Popover role="menu">
          {userHead}
          <MenuDivider />
          {userMenuItems}
        </Popover>
      )}
    </UserMenuWrap>
  );

  return (
    <>
      {contextHolder}
      <IndustrialHeader>
        <Logo type="button" aria-label="Home" onClick={() => navigate("/")}>
          <span className="logo-full">
            <BrandLogo />
          </span>
          <span className="logo-mark">
            <BrandLogo emblemOnly />
          </span>
        </Logo>

        <CompactBar>
          <MapOverlay>
            <ZoomPad></ZoomPad>
            <DirectMove></DirectMove>
          </MapOverlay>
          <HaStatusWidget compact />
          <ControlButton
            type="button"
            aria-label={t("header.navigation")}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuOutlined />
          </ControlButton>
        </CompactBar>

        <DrawerBackdrop
          $open={drawerOpen}
          onClick={() => setDrawerOpen(false)}
        />
        <DrawerPanel $open={drawerOpen} aria-label={t("header.navigation")}>
          <DrawerHead>
            <h2>{t("header.navigation")}</h2>
            <ControlButton
              type="button"
              aria-label="Close"
              onClick={() => setDrawerOpen(false)}
            >
              <CloseOutlined />
            </ControlButton>
          </DrawerHead>
          <DrawerBody>
            {items.map((item) => (
              <DrawerNavItem
                key={item.key}
                type="button"
                $active={isActivePath(pathname, item.key)}
                aria-current={
                  isActivePath(pathname, item.key) ? "page" : undefined
                }
                onClick={() => goTo(item.key)}
              >
                {item.label}
              </DrawerNavItem>
            ))}
            <MenuDivider />
            {userHead}
            {userMenuItems}
          </DrawerBody>
        </DrawerPanel>

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
            <NavShell>
              <NavBar aria-label={t("header.navigation")} ref={barRef}>
                {items.map((item, i) => {
                  const active = isActivePath(pathname, item.key);
                  const hidden = i >= hiddenFrom;
                  return (
                    <NavItem
                      key={item.key}
                      data-nav-item
                      type="button"
                      $active={active}
                      $hidden={hidden}
                      aria-hidden={hidden || undefined}
                      tabIndex={hidden ? -1 : undefined}
                      aria-current={active ? "page" : undefined}
                      onClick={() => goTo(item.key)}
                    >
                      {item.label}
                    </NavItem>
                  );
                })}
              </NavBar>
              {hiddenItems.length > 0 && (
                <NavMoreWrap ref={moreRef}>
                  <NavItem
                    type="button"
                    $active={activeHidden}
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    {t("header.more")}
                    <DownOutlined style={{ fontSize: 10 }} />
                  </NavItem>
                  {moreOpen && (
                    <Popover role="menu" style={{ top: "calc(100% - 4px)" }}>
                      {hiddenItems.map((item) => {
                        const active = isActivePath(pathname, item.key);
                        return (
                          <MenuItem
                            key={item.key}
                            type="button"
                            role="menuitem"
                            aria-current={active ? "page" : undefined}
                            style={
                              active
                                ? { color: "var(--c-header-accent)" }
                                : undefined
                            }
                            onClick={() => {
                              setMoreOpen(false);
                              goTo(item.key);
                            }}
                          >
                            {item.label}
                          </MenuItem>
                        );
                      })}
                    </Popover>
                  )}
                </NavMoreWrap>
              )}
            </NavShell>
          )}

          {activeRow === "tools" && (
            <ActionsBar>
              <MissionBtn />
            </ActionsBar>
          )}

          <RightGroup>
            {/* HA 主備: 哪一頁都看得到這台是 MASTER 還是 BACKUP (沒開 HA 不畫) */}
            <HaStatusWidget />

            {script?.isSimulate ? (
              <SimulationStatus>
                <ClockCircleOutlined />
                <StatusLabel>{t("header.sim_time")}</StatusLabel>
                <SimTime></SimTime>
              </SimulationStatus>
            ) : null}

            {script?.isSimulate ? (
              <ControlButton
                type="button"
                className="danger simulate-active"
                title={t("sim.start_sim_modal.inactive_sim")}
                onClick={handleAbortSim}
              >
                <PoweroffOutlined />
                {t("header.stop_sim")}
              </ControlButton>
            ) : showSimulationUi && can("system.sim_cars") ? (
              <ControlButton
                type="button"
                title={t("page_simulate")}
                onClick={() => setIsSimulateOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z" />
                </svg>
                {t("header.simulate")}
              </ControlButton>
            ) : null}

            {userMenu}
          </RightGroup>
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
