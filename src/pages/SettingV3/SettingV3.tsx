import { useEffect, useMemo, useRef, useState } from "react";
import { Layout, Form, Button, Drawer, Segmented } from "antd";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Header from "@/components/Header";
import MapSelector from "@/components/MapSelector";
import useMap from "@/api/useMap";
import useEditRevisionSync from "@/api/useEditRevisionSync";
import { centerMap, Scale } from "@/utils/gloable";
import {
  EditLocationPanelSwitch,
  EditRoadPanelSwitch,
  EditZoneSwitch,
  EditAnnotationSwitch,
  QuickEditLocationPanelSwitch,
} from "@/utils/siderGloble";
import SettingMapV3 from "./SettingMapV3";
import { ZoomPad, BKBtn } from "@/pages/Setting/components";
import { useResetSiderSwitch } from "@/pages/Setting/hooks";
import "@/pages/Setting/setting.css";
import { activeSettingPanelAtom } from "@/pages/SettingV2/activePanelAtom";
import { mapViewModeAtom, type MapViewMode } from "@/pages/SettingV2/mapViewModeAtom";
import { navCollapsedAtom } from "@/pages/SettingV2/navCollapsedAtom";
import { navCategories } from "@/pages/SettingV2/navItems";
import SettingV2Nav from "@/pages/SettingV2/SettingV2Nav";
import PanelRenderer from "@/pages/SettingV2/PanelRenderer";
import { ThemedConfigProvider } from "@/theme";
import useIsNarrow from "@/pages/SettingV2/ui/useIsNarrow";
import { c, font, mqNarrow, space } from "@/pages/SettingV2/ui/tokens";

const { Content } = Layout;

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
`;

/**
 * 窄螢幕專用的頂列。選單收進抽屜之後,要有地方放「開選單」和
 * 「面板 / 地圖」的切換,不然在手機上兩邊都到不了。
 */
const MobileBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.sm} ${space.md};
  background: ${c.bg};
  border-bottom: 1px solid ${c.border};
  font-family: ${font.mono};
  font-size: ${font.sm};
  font-weight: 700;
  letter-spacing: 0.5px;
  color: ${c.text};
`;

const MobileBarTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
  color: ${c.textSecondary};
`;

const PanelColumn = styled.div<{ $mode: MapViewMode }>`
  /* 三種模式要有三種版面:
     hidden = 地圖收起、面板吃滿;half = 左右各半;full = 面板收起、地圖吃滿。 */
  ${({ $mode }) => {
    if ($mode === "full") return `display: none;`;
    if ($mode === "hidden") return `display: flex; flex: 1; min-width: 0;`;
    return `display: flex; width: var(--panel-width, clamp(380px, 42%, 900px)); flex-shrink: 0;`;
  }}
  position: relative;
  height: 100%;
  flex-direction: column;
  background: ${c.bg};
  border-right: 1px solid ${c.border};
  min-height: 0;

  ${mqNarrow} {
    /* 窄螢幕一次只看一邊:除非切到「全開」,否則都以面板為主 */
    ${({ $mode }) =>
      $mode === "full"
        ? `display: none;`
        : `display: flex; width: 100%; flex: 1;`}
  }
`;

const PanelResizeHandle = styled.div`
  position: absolute;
  top: 0;
  right: -6px;
  bottom: 0;
  z-index: 2;
  width: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ew-resize;
  touch-action: none;

  &::before {
    content: "";
    width: 4px;
    height: 48px;
    border-radius: 2px;
    background: ${c.borderStrong};
  }

  ${mqNarrow} {
    display: none;
  }
`;

const PANEL_MIN_WIDTH = 320;
/** 拖到最寬時,地圖至少還留這麼多 */
const MAP_MIN_WIDTH = 160;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: ${c.bgSubtle};
  border-bottom: 1px solid ${c.border};
  font-family: ${font.mono};
  font-size: ${font.md};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${c.text};
`;

const PanelBody = styled.div`
  flex: 1;
  min-height: 0;
  /* 只允許垂直捲動。橫向溢出交給面板內自己的捲動容器(例如表格)處理,
     否則整個面板被捲出去時,白色底只到可視寬度為止,右邊會露出灰色底。 */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  background: ${c.bgSubtle};

  /* v1 的舊面板是照「整個內容區寬度」設計的(有些寫死 100vw),
     這裡強制收斂到面板欄寬度,讓它們的表格用自己的橫向捲軸。 */
  > * {
    max-width: 100%;
  }
`;

const MapColumn = styled.div<{ $mode: MapViewMode }>`
  display: ${({ $mode }) => ($mode === "hidden" ? "none" : "block")};
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
  background-color: ${c.bgMuted};

  ${mqNarrow} {
    /* 窄螢幕一次只顯示一邊,避免兩邊都擠成不能用 */
    display: ${({ $mode }) => ($mode === "full" ? "block" : "none")};
  }
`;


const MapSelectorSlot = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
`;

/**
 * 設定頁的畫布地圖版本 (/setting-v3): 導覽、面板跟 SettingV2 一模一樣 (同一批元件和 atom),
 * 只有右邊的地圖換成 SettingMapV3。SettingV2 (/setting-v2, /setting) 不動。
 */
const SettingV3: React.FC = () => {
  const { t } = useTranslation();
  const [locationPanelForm] = Form.useForm();
  const [roadPanelForm] = Form.useForm();
  const [zonePanelForm] = Form.useForm();
  const setScale = useSetAtom(Scale);
  const currentMapInfo = useMap();
  // 別人改了地圖或任務,這邊的地圖和列表幾秒內跟著更新
  useEditRevisionSync();
  const cm = useAtomValue(centerMap);
  const [activePanel, setActivePanel] = useAtom(activeSettingPanelAtom);
  const [mapMode, setMapMode] = useAtom(mapViewModeAtom);
  const isNarrow = useIsNarrow();
  const [navOpen, setNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useAtom(navCollapsedAtom);
  const panelDragRef = useRef<{
    startX: number;
    startWidth: number;
    maxWidth: number;
    /** 寫 --panel-width 的那層。寫在 Body 而不是面板本身,關掉面板再開寬度還在 */
    body: HTMLElement;
  } | null>(null);

  const handlePanelDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = e.currentTarget.parentElement;
    const body = panel?.parentElement;
    if (!panel || !body) return;
    const panelRect = panel.getBoundingClientRect();
    panelDragRef.current = {
      startX: e.clientX,
      startWidth: panelRect.width,
      maxWidth:
        body.getBoundingClientRect().right - panelRect.left - MAP_MIN_WIDTH,
      body,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePanelDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = panelDragRef.current;
    if (!drag) return;
    const next = drag.startWidth + (e.clientX - drag.startX);
    drag.body.style.setProperty(
      "--panel-width",
      `${Math.min(Math.max(next, PANEL_MIN_WIDTH), drag.maxWidth)}px`,
    );
  };

  const handlePanelDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDragRef.current) return;
    panelDragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // v1 也是這樣做的:進頁面先把幾顆地圖編輯模式的 atom 歸零。因為 v1/v2 共用同一份
  // atom,誰後進來誰負責重置,不會互相殘留狀態。
  useResetSiderSwitch();

  // 這幾顆 atom 不只是「面板有沒有開」,MapView 與 useDraggableLine/useZoneFrame/
  // useMousePoint 會直接讀它們來決定地圖上的互動模式(點擊打點、拉路徑、框選區域)。
  // 所以 v2 選到對應面板時要同步打開,換到別的面板要關掉,否則面板畫得出來但地圖上
  // 的互動會整個失效。
  const setEditLocationPanelSwitch = useSetAtom(EditLocationPanelSwitch);
  const setEditRoadPanelSwitch = useSetAtom(EditRoadPanelSwitch);
  const setEditZoneSwitch = useSetAtom(EditZoneSwitch);
  const setEditAnnotationSwitch = useSetAtom(EditAnnotationSwitch);
  const setQuickEditLocationPanelSwitch = useSetAtom(
    QuickEditLocationPanelSwitch,
  );
  useEffect(() => {
    setEditLocationPanelSwitch(activePanel === "location_panel");
    setEditRoadPanelSwitch(activePanel === "road_panel");
    setEditZoneSwitch(activePanel === "edit_zone");
    setQuickEditLocationPanelSwitch(activePanel === "quick_location_panel");
    setEditAnnotationSwitch(activePanel === "map_annotation");
  }, [
    activePanel,
    setEditLocationPanelSwitch,
    setEditRoadPanelSwitch,
    setEditZoneSwitch,
    setEditAnnotationSwitch,
    setQuickEditLocationPanelSwitch,
  ]);

  const mapScale = currentMapInfo?.data?.scale;
  useEffect(() => {
    if (mapScale === undefined) return;
    setScale(mapScale);
  }, [mapScale, cm, setScale]);

  const activeLabel = useMemo(() => {
    if (!activePanel) return "";
    for (const category of navCategories) {
      const leaf = category.children.find((c) => c.key === activePanel);
      if (leaf) return leaf.rawLabel ?? t(leaf.labelKey as never);
    }
    return activePanel;
  }, [activePanel, t]);

  return (
    <ThemedConfigProvider>
      <Layout style={{ height: "var(--app-height)" }}>
        <Header />
        <Content>
          <Shell>
            {isNarrow && (
              <MobileBar>
                <Button
                  type="text"
                  size="small"
                  icon={<MenuOutlined />}
                  onClick={() => setNavOpen(true)}
                />
                <MobileBarTitle>{activeLabel || "SETTINGS"}</MobileBarTitle>
                {activePanel && (
                  <>
                    <Segmented
                      size="small"
                      value={mapMode === "full" ? "map" : "panel"}
                      onChange={(v) =>
                        setMapMode(v === "map" ? "full" : "half")
                      }
                      options={[
                        { value: "panel", label: t("setting_v2.view_panel") },
                        { value: "map", label: t("setting_v2.view_map") },
                      ]}
                    />
                    {/* 窄螢幕的面板沒有自己的標題列,關閉鈕要放在這裡 */}
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setActivePanel(null)}
                    />
                  </>
                )}
              </MobileBar>
            )}

            <Body>
              {isNarrow ? (
                <Drawer
                  open={navOpen}
                  onClose={() => setNavOpen(false)}
                  placement="left"
                  width={280}
                  styles={{ body: { padding: 0 } }}
                >
                  <SettingV2Nav
                    activePanel={activePanel}
                    onSelectPanel={setActivePanel}
                    onAfterSelect={() => setNavOpen(false)}
                  />
                </Drawer>
              ) : (
                <SettingV2Nav
                  activePanel={activePanel}
                  onSelectPanel={setActivePanel}
                  collapsed={navCollapsed}
                  onToggleCollapse={() => setNavCollapsed(!navCollapsed)}
                />
              )}

              {activePanel && (
                <PanelColumn $mode={mapMode}>
                  {/* 窄螢幕的標題已經在 MobileBar 上了,這一列不用再出現一次 */}
                  {!isNarrow && (
                    <PanelHeader>
                      <span>{activeLabel}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => setActivePanel(null)}
                      />
                    </PanelHeader>
                  )}

                  <PanelBody>
                    <PanelRenderer
                      activeKey={activePanel}
                      locationPanelForm={locationPanelForm}
                      roadPanelForm={roadPanelForm}
                      zonePanelForm={zonePanelForm}
                    />
                  </PanelBody>

                  {mapMode === "half" && (
                    <PanelResizeHandle
                      onPointerDown={handlePanelDragStart}
                      onPointerMove={handlePanelDragMove}
                      onPointerUp={handlePanelDragEnd}
                      onPointerCancel={handlePanelDragEnd}
                    />
                  )}
                </PanelColumn>
              )}

              {/* 沒有選任何面板時,地圖一律全開,不然畫面會整片空的 */}
              <MapColumn $mode={activePanel ? mapMode : "full"}>
                <MapSelectorSlot>
                  <MapSelector />
                </MapSelectorSlot>
                <SettingMapV3
                  roadPanelForm={roadPanelForm}
                  locationPanelForm={locationPanelForm}
                  zonePanelForm={zonePanelForm}
                />
                <ZoomPad setScale={setScale} />
                <BKBtn />
              </MapColumn>
            </Body>
          </Shell>
        </Content>
      </Layout>
    </ThemedConfigProvider>
  );
};

export default SettingV3;
