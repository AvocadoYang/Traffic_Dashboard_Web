import { FC, useMemo, useState, createElement } from "react";
import {
  Button,
  Menu,
  Switch,
  Popconfirm,
  message,
  Segmented,
  Tooltip,
} from "antd";
import type { MenuProps } from "antd";
import {
  DeliveredProcedureOutlined,
  BorderOuterOutlined,
  RedoOutlined,
  UploadOutlined,
  EyeInvisibleOutlined,
  BorderHorizontalOutlined,
  ExpandOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import {
  MirStyleLocationPlacerSwitch,
  isOpenUploadWarningIDModal,
} from "@/utils/siderGloble";
import type { SettingV2PanelKey } from "./panelKeys";
import StartPoint from "@/pages/Setting/components/StartPoint/StartPoint";
import ImportMapConfigModal from "@/pages/Setting/components/importMap/ImportMapConfigModal";
import UploadWarningModal from "@/pages/Setting/components/UploadWarningModal";
import { navCategories } from "./navItems";
import useConfigFlags from "@/api/useConfigFlags";
import { mapViewModeAtom, type MapViewMode } from "./mapViewModeAtom";
import { c, font, mqNarrow } from "./ui/tokens";

const NAV_WIDTH = "240px";
/** 收起來之後只剩圖示,寬度抓得剛好放得下 antd 的圖示按鈕 */
const NAV_COLLAPSED_WIDTH = "56px";

const NavWrap = styled.div<{ $collapsed: boolean }>`
  width: ${({ $collapsed }) => ($collapsed ? NAV_COLLAPSED_WIDTH : NAV_WIDTH)};
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${c.bg};
  border-right: 1px solid ${c.borderStrong};
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  transition: width 0.18s ease;

  /* antd 收合後的 Menu 自己寫死 80px,要讓它跟著外框寬度走 */
  .ant-menu-inline-collapsed {
    width: 100%;
  }

  /* 窄螢幕時這份選單是塞在抽屜裡的,要吃滿抽屜寬度也不用右邊框 */
  ${mqNarrow} {
    width: 100%;
    border-right: none;
  }
`;

const CollapseRow = styled.div<{ $collapsed: boolean }>`
  display: flex;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-end")};
  padding: 6px 8px;
  border-bottom: 1px solid ${c.border};
`;

const ExtraRow = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) =>
    $collapsed ? "center" : "space-between"};
  gap: 8px;
  padding: ${({ $collapsed }) => ($collapsed ? "10px 4px" : "10px 16px")};
  border-bottom: 1px solid ${c.border};
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.textSecondary};
`;

const ActionList = styled.div`
  border-top: 1px solid ${c.border};
  padding: 8px 0;
  margin-top: auto;
`;

const ActionButton = styled.button<{ $collapsed: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) =>
    $collapsed ? "center" : "flex-start"};
  gap: 10px;
  padding: ${({ $collapsed }) => ($collapsed ? "10px 0" : "10px 16px")};
  border: none;
  background: transparent;
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.textSecondary};
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${c.bgMuted};
    color: ${c.text};
  }
`;

type Props = {
  activePanel: SettingV2PanelKey | null;
  onSelectPanel: (key: SettingV2PanelKey | null) => void;
  /** 選完一個項目之後要做的事。窄螢幕用來把抽屜收起來。 */
  onAfterSelect?: () => void;
  /** 收起成只剩圖示的細長條。抽屜版不給收,所以預設 false。 */
  collapsed?: boolean;
  /** 有給才會出現收合鈕;抽屜版不需要。 */
  onToggleCollapse?: () => void;
};

const SettingV2Nav: FC<Props> = ({
  activePanel,
  onSelectPanel,
  onAfterSelect,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [mapMode, setMapMode] = useAtom(mapViewModeAtom);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [openStartPoint, setOpenStartPoint] = useState(false);
  const [openImportMapConfig, setImportMapConfig] = useState(false);
  const [mirStylePlacer, setMirStylePlacer] = useAtom(
    MirStyleLocationPlacerSwitch,
  );
  const [, setOpenUploadWarning] = useAtom(isOpenUploadWarningIDModal);
  const { data: configFlags } = useConfigFlags();
  const hasMir = configFlags?.hasMir ?? true;

  const restartMutate = useMutation({
    mutationFn: () => client.post("api/setting/restart"),
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const menuItems: MenuProps["items"] = useMemo(
    () =>
      navCategories
        .filter((category) => hasMir || category.key !== "mir")
        .map((category) => ({
          key: category.key,
          icon: createElement(category.icon),
          label: category.rawLabel ?? t(category.labelKey as never),
          children: category.children.map((leaf) => ({
            key: leaf.key,
            label: leaf.rawLabel ?? t(leaf.labelKey as never),
          })),
        })),
    [t, hasMir],
  );

  const uploadWarningLabel = t("toolbar.file_setting.upload_warning_file");
  const startPointLabel = t("toolbar.file_setting.start_point");
  const importMapLabel = t("toolbar.file_setting.import_map");
  const restartLabel = t("toolbar.restart.restart");

  // 點同一個項目 = 收起來,點別的 = 直接換過去,永遠只會有一個面板。
  const handleClick: MenuProps["onClick"] = ({ key }) => {
    onSelectPanel(activePanel === key ? null : (key as SettingV2PanelKey));
    // 窄螢幕時選單是抽屜,選完要收起來才看得到面板
    onAfterSelect?.();
  };

  return (
    <NavWrap $collapsed={collapsed}>
      {contextHolder}

      {onToggleCollapse && (
        <CollapseRow $collapsed={collapsed}>
          <Tooltip
            title={collapsed ? "展開選單" : "收起選單"}
            placement="right"
          >
            <Button
              type="text"
              size="small"
              aria-label={collapsed ? "展開選單" : "收起選單"}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={onToggleCollapse}
            />
          </Tooltip>
        </CollapseRow>
      )}

      <ExtraRow $collapsed={collapsed}>
        {!collapsed && <span>地圖</span>}
        <Segmented
          size="small"
          /* 收起來只有 56px,三顆並排放不下,改成直的 */
          vertical={collapsed}
          value={mapMode}
          onChange={(v) => setMapMode(v as MapViewMode)}
          options={[
            {
              value: "hidden",
              label: (
                <Tooltip title="全隱藏">
                  <EyeInvisibleOutlined />
                </Tooltip>
              ),
            },
            {
              value: "half",
              label: (
                <Tooltip title="半開">
                  <BorderHorizontalOutlined />
                </Tooltip>
              ),
            },
            {
              value: "full",
              label: (
                <Tooltip title="全開">
                  <ExpandOutlined />
                </Tooltip>
              ),
            },
          ]}
        />
      </ExtraRow>

      {hasMir && (
        <ExtraRow $collapsed={collapsed}>
          {!collapsed && <span>MiR 風格打點</span>}
          <Tooltip title={collapsed ? "MiR 風格打點" : ""} placement="right">
            <Switch
              size="small"
              checked={mirStylePlacer}
              onChange={setMirStylePlacer}
            />
          </Tooltip>
        </ExtraRow>
      )}

      <Menu
        mode="inline"
        items={menuItems}
        inlineCollapsed={collapsed}
        selectedKeys={activePanel ? [activePanel] : []}
        onClick={handleClick}
        style={{ borderInlineEnd: "none" }}
      />

      <ActionList>
        {/* 收起來時只留圖示,文字改掛 title:這幾顆被 Popconfirm 包著,
            再包一層 Tooltip 會把 Popconfirm 塞進來的 onClick 卡掉。 */}
        <ActionButton
          $collapsed={collapsed}
          title={collapsed ? uploadWarningLabel : undefined}
          onClick={() => setOpenUploadWarning(true)}
        >
          <UploadOutlined />
          {!collapsed && uploadWarningLabel}
        </ActionButton>
        <ActionButton
          $collapsed={collapsed}
          title={collapsed ? startPointLabel : undefined}
          onClick={() => setOpenStartPoint(true)}
        >
          <BorderOuterOutlined />
          {!collapsed && startPointLabel}
        </ActionButton>
        <ActionButton
          $collapsed={collapsed}
          title={collapsed ? importMapLabel : undefined}
          onClick={() => setImportMapConfig(true)}
        >
          <DeliveredProcedureOutlined />
          {!collapsed && importMapLabel}
        </ActionButton>
        {/* v1 是直接點下去就重啟,這裡加一層確認:單選選單比開關更容易誤點,
            而重啟會讓整個系統中斷再 reload。 */}
        <Popconfirm
          title={t("toolbar.restart.restart")}
          onConfirm={() => {
            restartMutate.mutate();
            setTimeout(() => window.location.reload(), 6000);
          }}
          okText={t("utils.confirm")}
          cancelText={t("utils.cancel")}
          placement="right"
        >
          <ActionButton
            $collapsed={collapsed}
            title={collapsed ? restartLabel : undefined}
          >
            <RedoOutlined />
            {!collapsed && restartLabel}
          </ActionButton>
        </Popconfirm>
      </ActionList>

      <StartPoint
        openStartPoint={openStartPoint}
        setOpenStartPoint={setOpenStartPoint}
      />
      <ImportMapConfigModal
        openImportMapConfig={openImportMapConfig}
        setImportMapConfig={setImportMapConfig}
      />
      <UploadWarningModal />
    </NavWrap>
  );
};

export default SettingV2Nav;
