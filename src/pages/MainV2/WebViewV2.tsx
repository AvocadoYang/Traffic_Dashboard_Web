import {
  Button,
  ConfigProvider,
  Popover,
  Segmented,
  Splitter,
  Tooltip,
  message,
} from "antd";
import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import "@/pages/Main/components/WebView/webview.css";
import ZoomPad from "@/pages/Main/components/WebView/components/ZoomPad";
import ScalePad from "@/pages/Main/components/WebView/components/ScalePad";
import CanvasMap, { CanvasMapApi } from "@/components/CanvasMap/CanvasMap";
import MainDevices from "./MainDevices";
import SimCarPanel from "@/components/SimCars/SimCarPanel";
import SimCarMarkers from "@/components/SimCars/SimCarMarkers";
import useSimCarPlacement from "@/components/SimCars/useSimCarPlacement";
import useUiConfig from "@/api/useUiConfig";
import { OpenDirect } from "@/pages/Main/global/jotai";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import CarCardWrap from "@/pages/Main/Car_Card/CardWrap";
import { centerMap, darkMode, Scale } from "@/utils/gloable";
import MissionWrap from "@/pages/Main/Mission_Card/MissionWrap";
import DirectMove from "@/pages/Main/components/missionModal/DirectMove";
import CargoPanel from "@/components/CargoPanel/CargoPanel";
import MissionDispatchPanel from "@/pages/Main/components/WebView/components/MissionDispatchPanel";
import useMap from "@/api/useMap";
import JoystickPanelWrap from "@/pages/Main/Car_Card/JoystickPanelWrap";
import MapSelector from "@/components/MapSelector";
import PerformancePanel from "@/components/Performance/PerformancePanel";
import OpenPerformanceBtn from "@/components/Performance/OpenPerformanceBtn";
import styled, { css } from "styled-components";
import { mq } from "@/styles/responsive";
import { useTranslation } from "react-i18next";
import { themeAtom } from "@/theme";
import { AimOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PushpinOutlined, TagOutlined } from "@ant-design/icons";
import { useMyProfile, useSaveProfile } from "@/api/useProfile";
import { mapViewModeAtom, MapViewMode, patrolAtom, vehicleLabelsAtom } from "@/components/Fleet3D/viewMode";
import {
  isShowAnnotation,
  isShowLocation,
  isShowPointCloud,
  isShowRoad,
  showAllZonesSwitch,
} from "@/utils/siderGloble";

const { Content } = Layout;

// three.js 很大, 切到 3D 才載
const LiveFleet3D = lazy(() => import("@/components/Fleet3D/LiveFleet3D"));

const WebViewContent = styled(Content)`
  width: 100%;
  overflow: hidden;
`;

const MapSplitter = styled(Splitter)`
  > .ant-splitter-panel:first-child,
  > .ant-splitter-panel:last-child,
  > .ant-splitter-bar {
    display: none;
  }

  > .ant-splitter-panel:not(:first-child):not(:last-child) {
    min-width: 100%;
  }

  > .ant-splitter-panel {
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  ${mq.web} {
    > .ant-splitter-panel:first-child,
    > .ant-splitter-panel:last-child {
      display: block;
    }

    > .ant-splitter-bar {
      display: flex;
    }

    > .ant-splitter-panel:not(:first-child):not(:last-child) {
      min-width: auto;
    }
  }
`;

const SidePanelInner = styled.div`
  height: 100%;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const MapPanelInner = styled.div`
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: var(--c-bg-muted);
  display: flex;
  flex-direction: column;
`;

/** 畫布地圖自己處理平移縮放, 這裡只負責佔住剩下的空間 */
const MapArea = styled.div`
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
`;

type BottomView = "car" | "mission" | "dispatch";

const BottomPanelSection = styled.div<{ $view: BottomView }>`
  min-height: 9rem;
  display: flex;
  flex-direction: column;

  ${({ $view }) =>
    $view === "car"
      ? css`
          flex: 0 0 auto;
          /* 詳細模式的車輛卡片很高,不設上限會把地圖整個擠掉 */
          max-height: 60%;
        `
      : css`
          flex: 0 1 auto;
          max-height: 60%;
        `}

  ${mq.web} {
    display: none;
  }
`;

const BottomPanelTabs = styled.div<{ $isDark: boolean }>`
  flex: 0 0 auto;
  padding: var(--space-xs) var(--space-md);
  background: var(--c-bg-subtle);
  border-top: 1px solid var(--c-header-border);
`;

const BottomPanelBody = styled.div<{ $view: BottomView }>`
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: ${({ $view }) => ($view === "car" ? "auto" : "hidden")};
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.28) transparent;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.06);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.28);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.45);
  }

  && > * {
    padding: var(--space-sm) var(--space-md);
  }

  ${({ $view }) =>
    $view === "car" &&
    css`
      && > * > .car-card-grid {
        flex-wrap: nowrap;
        justify-content: flex-start;
      }
    `}
`;

// 不產生任何 box model, 只用來定位
const MapOverlay = styled.div`
  display: none;
  ${mq.web} {
    display: contents;
  }
`;

const MapSelectorSlot = styled.div`
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  z-index: 20;
`;

const ToggleSidebarBtn = styled(Button)`
  position: absolute;
  top: var(--space-sm);
  right: 13rem;
  z-index: 20;
`;

/** 2D / 3D 切換, 放在地圖上方中間 (各種螢幕寬度都看得到) */
const ViewModeSlot = styled.div`
  position: absolute;
  top: var(--space-sm);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;

  > * {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-radius: 8px;
  }
`;

const SaveViewBtn = styled(Button)`
  position: absolute;
  top: var(--space-sm);
  right: calc(13rem + 40px);
  z-index: 20;
`;

/**
 * 已經套用過哪個帳號的地圖圖層偏好。放在模組層: App 重繪 (換語言) 會讓首頁重掛,
 * 用 ref 會再套一次, 把工具列剛切的圖層蓋回去
 */
let layersAppliedFor: string | null = null;

/**
 * 首頁 (WebView) 的畫布地圖版本: 版面、車輛 / 任務面板、地圖工具列都跟舊首頁一樣,
 * 只有中間的地圖換成 CanvasMap。
 */
const WebViewV2 = () => {
  const isDark = useAtomValue(darkMode);
  // antd 的 token 不能吃 var(),要餵真實色碼,所以這裡直接拿 palette
  const { colors } = useAtomValue(themeAtom);
  const currentMapInfo = useMap();
  const setScale = useSetAtom(Scale);
  const cm = useAtomValue(centerMap);
  const { t } = useTranslation();
  const [bottomView, setBottomView] = useState<BottomView>("car");
  const [viewMode, setViewMode] = useAtom(mapViewModeAtom);
  const [patrol, setPatrol] = useAtom(patrolAtom);
  const [vehicleLabels, setVehicleLabels] = useAtom(vehicleLabelsAtom);
  const [showSidebars, setShowSidebars] = useState(true);
  // 點地圖上的點位: 打開「直接移動」(同舊首頁)
  const setOpenDirect = useSetAtom(OpenDirect);
  const openDirectMove = useCallback(
    (locationId: string) => setOpenDirect({ open: true, locationId }),
    [setOpenDirect],
  );

  // 模擬車輛面板: 車從面板 (或地圖上已放的位置) 拖到地圖, 放到最近的點位
  const mapApiRef = useRef<CanvasMapApi | null>(null);
  const simCarDrop = useSimCarPlacement(mapApiRef);
  // 實際案場 (YAML SHOW_SIMULATION_UI: false) 不顯示「模擬車輛」
  const { showSimulationUi } = useUiConfig();

  // 個人設定: 地圖預設視角 + 圖層 (換帳號登入才重套, 之後工具列切換不會被蓋回去)
  const { data: profile } = useMyProfile();
  const saveProfile = useSaveProfile();
  const [messageApi, messageHolder] = message.useMessage();
  const preferredView = profile?.preferences.map?.view ?? null;
  const setShowLocation = useSetAtom(isShowLocation);
  const setShowRoad = useSetAtom(isShowRoad);
  const setShowPointCloud = useSetAtom(isShowPointCloud);
  const setShowAnnotation = useSetAtom(isShowAnnotation);
  const setShowZones = useSetAtom(showAllZonesSwitch);
  useEffect(() => {
    if (!profile || layersAppliedFor === profile.id) return;
    layersAppliedFor = profile.id;
    const layers = profile.preferences.map?.layers;
    if (!layers) return;
    if (layers.location !== undefined) setShowLocation(layers.location);
    if (layers.road !== undefined) setShowRoad(layers.road);
    if (layers.pointCloud !== undefined) setShowPointCloud(layers.pointCloud);
    if (layers.annotation !== undefined) setShowAnnotation(layers.annotation);
    if (layers.zones !== undefined) setShowZones(layers.zones);
  }, [profile, setShowLocation, setShowRoad, setShowPointCloud, setShowAnnotation, setShowZones]);

  const saveCurrentView = () => {
    const view = mapApiRef.current?.currentView();
    if (!view) return;
    saveProfile.mutate(
      { preferences: { map: { view } } },
      {
        onSuccess: () => void messageApi.success(t("profile.prefs.view_saved_toast")),
        onError: () => void messageApi.error(t("profile.save_failed")),
      },
    );
  };

  const mapScale = currentMapInfo?.data?.scale;
  useEffect(() => {
    if (mapScale === undefined) return;
    setScale(mapScale);
  }, [mapScale, cm, setScale]);

  return (
    <WebViewContent>
      {messageHolder}
      {/* 點地圖上的貨架 / 輸送帶 / stack / 電梯,右側打開貨物面板 */}
      <CargoPanel />
      <ConfigProvider
        theme={{
          components: {
            Splitter: {
              colorFill: colors.borderStrong,
              controlItemBgActiveHover: colors.headerAccent,
              controlItemBgHover: colors.bgMuted,
            },
            Segmented: {
              trackBg: colors.bg,
              itemColor: colors.textSecondary,
              itemHoverColor: colors.text,
              itemHoverBg: colors.bgMuted,
              itemSelectedBg: colors.headerAccentSoft,
              itemSelectedColor: colors.headerAccent,
            },
          },
        }}
      >
        <MapSplitter>
          {showSidebars && (
            <Splitter.Panel
              defaultSize="13%"
              collapsible={true}
              className={`${isDark ? "dark-mode-side" : ""}`}
            >
              <SidePanelInner>
                <CarCardWrap></CarCardWrap>
              </SidePanelInner>
            </Splitter.Panel>
          )}
          <Splitter.Panel
            defaultSize="67%"
            className={`${isDark ? "dark-mode-map" : ""}`}
          >
            <MapPanelInner>
              <MapArea
                onDragOver={simCarDrop.onDragOver}
                onDrop={simCarDrop.onDrop}
              >
                {simCarDrop.contextHolder}
                {viewMode === "3d" ? (
                  <Suspense fallback={null}>
                    <LiveFleet3D onPointClick={openDirectMove} apiRef={mapApiRef} />
                  </Suspense>
                ) : (
                  <CanvasMap onPointClick={openDirectMove} apiRef={mapApiRef} preferredView={preferredView}>
                    <MainDevices />
                    {showSimulationUi ? <SimCarMarkers /> : null}
                  </CanvasMap>
                )}
              </MapArea>
              <ViewModeSlot>
                <Segmented<MapViewMode>
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: "2d", label: t("map_tool.view_2d") },
                    { value: "3d", label: t("map_tool.view_3d") },
                  ]}
                />
                {/* 3D 的巡視模式: 有告警時鏡頭自動飛過去 (Fleet3D/patrol.ts) */}
                {viewMode === "3d" && (
                  <Tooltip title={t("fleet3d.patrol.tip")}>
                    <Button
                      type={patrol ? "primary" : "default"}
                      icon={<AimOutlined />}
                      onClick={() => setPatrol(!patrol)}
                      aria-pressed={patrol}
                      data-testid="fleet3d-patrol"
                    >
                      {t("fleet3d.patrol.label")}
                    </Button>
                  </Tooltip>
                )}
                {/* 3D 車上的標籤: 預設關掉 (游標移到車上才顯示) */}
                {viewMode === "3d" && (
                  <Tooltip title={t("fleet3d.labels.tip")}>
                    <Button
                      type={vehicleLabels ? "primary" : "default"}
                      icon={<TagOutlined />}
                      onClick={() => setVehicleLabels(!vehicleLabels)}
                      aria-pressed={vehicleLabels}
                      data-testid="fleet3d-vehicle-labels"
                    >
                      {t("fleet3d.labels.label")}
                    </Button>
                  </Tooltip>
                )}
              </ViewModeSlot>
              <MapOverlay>
                <ZoomPad></ZoomPad>
                <ScalePad></ScalePad>

                {/* 效能監看: 車隊跟不跟得上 + 程式卡不卡。
                    按鈕排在 ScalePad (top 16px) 下面;
                    面板讓開右上角的 MapSelectorSlot */}
                <OpenPerformanceBtn top="72px" left="16px" />
                <PerformancePanel top="64px" right="16px" />
                {/* 模擬車輛: 取代舊的 /simulate 頁; 開始 / 停止模擬還是 Header 的按鈕 */}
                {showSimulationUi ? <SimCarPanel top="128px" left="16px" /> : null}
                {profile && viewMode === "2d" && (
                  <Tooltip title={t("profile.prefs.save_view")}>
                    <SaveViewBtn
                      icon={<PushpinOutlined />}
                      aria-label={t("profile.prefs.save_view")}
                      loading={saveProfile.isLoading}
                      onClick={saveCurrentView}
                    />
                  </Tooltip>
                )}
                <ToggleSidebarBtn
                  type="primary"
                  icon={showSidebars ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setShowSidebars(!showSidebars)}
                />
                <DirectMove></DirectMove>
              </MapOverlay>

              <BottomPanelSection $view={bottomView}>
                <BottomPanelTabs $isDark={isDark}>
                  <Segmented<BottomView>
                    block
                    value={bottomView}
                    onChange={setBottomView}
                    options={[
                      {
                        label: t("toolbar.amr_setting.robot"),
                        value: "car",
                      },
                      { label: t("utils.missions"), value: "mission" },
                      {
                        label: t("main.card_name.mission"),
                        value: "dispatch",
                      },
                    ]}
                  />
                </BottomPanelTabs>
                <BottomPanelBody $view={bottomView}>
                  {bottomView === "car" && <CarCardWrap></CarCardWrap>}
                  {bottomView === "mission" && <MissionWrap></MissionWrap>}
                  {bottomView === "dispatch" && (
                    <MissionDispatchPanel></MissionDispatchPanel>
                  )}
                </BottomPanelBody>
              </BottomPanelSection>

              <MapSelectorSlot>
                <MapSelector />
              </MapSelectorSlot>
            </MapPanelInner>
          </Splitter.Panel>
          {showSidebars && (
            <Splitter.Panel
              defaultSize="20%"
              collapsible={true}
              className={`${isDark ? "dark-mode-side" : ""}`}
            >
              <SidePanelInner>
                <MissionWrap></MissionWrap>
              </SidePanelInner>
            </Splitter.Panel>
          )}
        </MapSplitter>
        <JoystickPanelWrap />
      </ConfigProvider>
    </WebViewContent>
  );
};

export default memo(WebViewV2);
