import { useEffect, useMemo, useRef } from "react";
import { Layout, Form, Button, ConfigProvider, Segmented, Tooltip } from "antd";
import {
  CloseOutlined,
  EyeInvisibleOutlined,
  BorderHorizontalOutlined,
  ExpandOutlined,
} from "@ant-design/icons";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Header from "@/components/Header";
import MapSelector from "@/components/MapSelector";
import useMap from "@/api/useMap";
import { centerMap, Scale } from "@/utils/gloable";
import {
  EditLocationPanelSwitch,
  EditRoadPanelSwitch,
  EditZoneSwitch,
} from "@/utils/siderGloble";
import MapView from "@/pages/Setting/mapComponents/MapView";
import { ZoomPad, BKBtn } from "@/pages/Setting/components";
import { useResetSiderSwitch } from "@/pages/Setting/hooks";
import "@/pages/Setting/setting.css";
import { activeSettingPanelAtom } from "./activePanelAtom";
import { mapViewModeAtom, type MapViewMode } from "./mapViewModeAtom";
import { navCategories } from "./navItems";
import SettingV2Nav from "./SettingV2Nav";
import PanelRenderer from "./PanelRenderer";
import { settingV2Theme } from "./ui/theme";
import { c, font, mqNarrow } from "./ui/tokens";

const { Content } = Layout;

const Body = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  min-height: 0;
`;

const PanelColumn = styled.div<{ $mode: MapViewMode }>`
  /* 地圖全隱藏時面板吃滿剩餘空間;半開時各佔一半;全開時面板整個收起來。 */
  ${({ $mode }) =>
    $mode === "hidden"
      ? `flex: 1; min-width: 0;`
      : `width: clamp(380px, 42%, 900px); flex-shrink: 0;`}
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${c.bg};
  border-right: 1px solid ${c.border};
  min-height: 0;

  ${mqNarrow} {
    /* 窄螢幕:面板優先,地圖靠下面的切換鈕決定要不要看 */
    width: 100%;
    flex: 1;
  }
`;

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
  overflow: auto;
  padding: 12px;
  background: ${c.bgSubtle};
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

const MapModeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: ${c.bg};
  border-bottom: 1px solid ${c.border};
  font-family: ${font.mono};
  font-size: ${font.xs};
  color: ${c.textMuted};
  letter-spacing: 0.8px;
  text-transform: uppercase;
`;

const MapScroll = styled.div`
  height: 100%;
  width: 100%;
  overflow: scroll;
`;

const MapSelectorSlot = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
`;

const SettingV2: React.FC = () => {
  const mapRef = useRef(null);
  const mapWrapRef = useRef(null);
  const { t } = useTranslation();
  const [locationPanelForm] = Form.useForm();
  const [roadPanelForm] = Form.useForm();
  const [zonePanelForm] = Form.useForm();
  const [scale, setScale] = useAtom(Scale);
  const currentMapInfo = useMap();
  const cm = useAtomValue(centerMap);
  const [activePanel, setActivePanel] = useAtom(activeSettingPanelAtom);
  const [mapMode, setMapMode] = useAtom(mapViewModeAtom);

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
  useEffect(() => {
    setEditLocationPanelSwitch(activePanel === "location_panel");
    setEditRoadPanelSwitch(activePanel === "road_panel");
    setEditZoneSwitch(activePanel === "edit_zone");
  }, [
    activePanel,
    setEditLocationPanelSwitch,
    setEditRoadPanelSwitch,
    setEditZoneSwitch,
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

  const mapModeOptions = [
    {
      value: "hidden" as const,
      icon: <EyeInvisibleOutlined />,
      title: "全隱藏",
    },
    {
      value: "half" as const,
      icon: <BorderHorizontalOutlined />,
      title: "半開",
    },
    { value: "full" as const, icon: <ExpandOutlined />, title: "全開" },
  ];

  return (
    <ConfigProvider theme={settingV2Theme}>
      <Layout style={{ height: "var(--app-height)" }}>
        <Header />
        <Content>
        <Body>
          <SettingV2Nav
            activePanel={activePanel}
            onSelectPanel={setActivePanel}
          />

          {activePanel && (
            <PanelColumn $mode={mapMode}>
              <PanelHeader>
                <span>{activeLabel}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => setActivePanel(null)}
                />
              </PanelHeader>

              <MapModeBar>
                <span>地圖</span>
                <Segmented
                  size="small"
                  value={mapMode}
                  onChange={(v) => setMapMode(v as MapViewMode)}
                  options={mapModeOptions.map((o) => ({
                    value: o.value,
                    label: (
                      <Tooltip title={o.title}>
                        <span>{o.icon}</span>
                      </Tooltip>
                    ),
                  }))}
                />
              </MapModeBar>

              <PanelBody>
                <PanelRenderer
                  activeKey={activePanel}
                  locationPanelForm={locationPanelForm}
                  roadPanelForm={roadPanelForm}
                  zonePanelForm={zonePanelForm}
                />
              </PanelBody>
            </PanelColumn>
          )}

          {/* 沒有選任何面板時,地圖一律全開,不然畫面會整片空的 */}
          <MapColumn $mode={activePanel ? mapMode : "full"}>
            <MapSelectorSlot>
              <MapSelector />
            </MapSelectorSlot>
            <MapScroll draggable={false} ref={mapWrapRef}>
              <MapView
                scale={scale}
                mapRef={mapRef}
                mapWrapRef={mapWrapRef}
                roadPanelForm={roadPanelForm}
                locationPanelForm={locationPanelForm}
                zonePanelForm={zonePanelForm}
              />
            </MapScroll>
            <ZoomPad setScale={setScale} />
            <BKBtn />
          </MapColumn>
        </Body>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default SettingV2;
