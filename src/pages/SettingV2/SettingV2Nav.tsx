import { FC, useMemo, useState, createElement } from "react";
import { Menu, Switch, Popconfirm, message, Segmented, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  DeliveredProcedureOutlined,
  BorderOuterOutlined,
  RedoOutlined,
  UploadOutlined,
  EyeInvisibleOutlined,
  BorderHorizontalOutlined,
  ExpandOutlined,
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
import type { ToolBarItemType } from "@/pages/Setting/components/siderElement";
import StartPoint from "@/pages/Setting/components/StartPoint/StartPoint";
import ImportMapConfigModal from "@/pages/Setting/components/importMap/ImportMapConfigModal";
import UploadWarningModal from "@/pages/Setting/components/UploadWarningModal";
import { navCategories } from "./navItems";
import { mapViewModeAtom, type MapViewMode } from "./mapViewModeAtom";

const NavWrap = styled.div`
  width: 240px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #d9d9d9;
  overflow-y: auto;
  scrollbar-width: thin;
`;

const ExtraRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #595959;
`;

const ActionList = styled.div`
  border-top: 1px solid #f0f0f0;
  padding: 8px 0;
  margin-top: auto;
`;

const ActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #595959;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: #f0f5ff;
    color: #1890ff;
  }
`;

type Props = {
  activePanel: ToolBarItemType | null;
  onSelectPanel: (key: ToolBarItemType | null) => void;
};

const SettingV2Nav: FC<Props> = ({ activePanel, onSelectPanel }) => {
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
      navCategories.map((category) => ({
        key: category.key,
        icon: createElement(category.icon),
        label: category.rawLabel ?? t(category.labelKey as never),
        children: category.children.map((leaf) => ({
          key: leaf.key,
          label: leaf.rawLabel ?? t(leaf.labelKey as never),
        })),
      })),
    [t],
  );

  // 點同一個項目 = 收起來,點別的 = 直接換過去,永遠只會有一個面板。
  const handleClick: MenuProps["onClick"] = ({ key }) => {
    onSelectPanel(activePanel === key ? null : (key as ToolBarItemType));
  };

  return (
    <NavWrap>
      {contextHolder}

      <ExtraRow>
        <span>地圖</span>
        <Segmented
          size="small"
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

      <ExtraRow>
        <span>MiR 風格打點</span>
        <Switch
          size="small"
          checked={mirStylePlacer}
          onChange={setMirStylePlacer}
        />
      </ExtraRow>

      <Menu
        mode="inline"
        items={menuItems}
        selectedKeys={activePanel ? [activePanel] : []}
        onClick={handleClick}
        style={{ borderInlineEnd: "none" }}
      />

      <ActionList>
        <ActionButton onClick={() => setOpenUploadWarning(true)}>
          <UploadOutlined />
          {t("toolbar.file_setting.upload_warning_file")}
        </ActionButton>
        <ActionButton onClick={() => setOpenStartPoint(true)}>
          <BorderOuterOutlined />
          {t("toolbar.file_setting.start_point")}
        </ActionButton>
        <ActionButton onClick={() => setImportMapConfig(true)}>
          <DeliveredProcedureOutlined />
          {t("toolbar.file_setting.import_map")}
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
          <ActionButton>
            <RedoOutlined />
            {t("toolbar.restart.restart")}
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
