import React, { useState, memo, useEffect, useRef, useCallback } from "react";
import { Layout, Menu, message, Switch, Drawer } from "antd";
import styled from "styled-components";
import { mq } from "@/styles/responsive";
import useMap from "@/api/useMap";
import UploadWarningModal from "./UploadWarningModal";
import { useAtom, useSetAtom } from "jotai";
import {
  toolSheetPanelHost,
  EditLocationPanelSwitch,
  EditLocationListTableSwitch,
  isShowLocationTooltip,
  EditRoadPanelSwitch,
  QuickEditLocationPanelSwitch,
  RoadListTableSwitch,
  EditZoneSwitch,
  EditShelfPanelSwitch,
  EditShelfCategoryPanelSwitch,
  EditShelfYawPanelSwitch,
  showAllZonesSwitch,
  showZonesTableSwitch,
  isShowEditMission,
  isShowEditChargeMission,
  isShowEditBeforeLeftChargeStationMission,
  isShowEditScheduleMission,
  isShowEditIdleMission,
  isShowEditTopicMission,
  isShowEditMissionTag,
  isShowEditChargeStationPosition,
  isShowEditWarningId,
  isShowEditBackup,
  isOpenUploadWarningIDModal,
  isOpenSwitchMap,
  isShowRegisterAMR,
  isShowAMRConfig,
  QuickEditRoadSwitch,
  isShowEditAbortMissionWhenHasCargoMission,
  isShowEditCustomCargoFormat,
  isShowPeripheralNameTable,
  isShowPeripheralGroupTable,
  isShowEditBlindLocationMission,
  isShowContainerTable,
  isShowSystemAlarm,
  isShowMapGroupTable,
  isShowChargeStationDockConfig,
  isHowFootprint,
  isShowSound,
  isShowMarketType,
} from "@/utils/siderGloble";
import {
  AimOutlined,
  NodeIndexOutlined,
  BorderOuterOutlined,
  GoldOutlined,
  DeploymentUnitOutlined,
  ScheduleOutlined,
  FileOutlined,
  DeliveredProcedureOutlined,
  RedoOutlined,
  CarOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { MenuProps } from "antd";
import "../setting.css";
import { ToolBarItemType } from "./siderElement";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import ImportMapConfigModal from "./importMap/ImportMapConfigModal";
import StartPoint from "./StartPoint/StartPoint";
import useIsWebMediaQuery from "@/hooks/useIsWebMediaQuery";

export type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: "group",
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

const { Sider: AntdSider } = Layout;

/* 側邊欄只在 web 的 breakpoint 出現，以下改用 ToolSheet */
const DesktopSider = styled(AntdSider)`
  && {
    display: none;
    background-color: #ffffff;
    overflow-y: auto;
  }

  ${mq.web} {
    && {
      display: block;
    }
  }
`;

const ToolSheet = styled(Drawer)`
  && {
    border-radius: var(--space-lg) var(--space-lg) 0 0;
    overflow: hidden;
    max-height: var(--tool-sheet-max-height);
  }

  && .ant-drawer-header {
    padding: 0 var(--space-sm);
    border-bottom: 1px solid #f0f0f0;
  }

  && .ant-drawer-body {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }
`;

const SheetHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) 0;
  cursor: ns-resize;
  touch-action: none;

  &::before {
    content: "";
    width: 60px;
    height: 8px;
    border-radius: 4px;
    background: #d9d9d9;
  }
`;

const SheetTabs = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid #f0f0f0;
`;

const SheetTab = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  min-width: 72px;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? "#1890ff" : "transparent")};
  background: ${({ $active }) =>
    $active ? "rgba(24, 144, 255, 0.08)" : "transparent"};
  color: ${({ $active }) => ($active ? "#1890ff" : "#595959")};
  font-family: inherit;
  font-size: var(--font-xs);
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s;

  .anticon {
    font-size: var(--tool-sheet-icon-size);
  }
`;

const SheetCategoryPanel = styled.div`
  flex: 0 1 auto;
  min-height: var(--tool-sheet-menu-min-height);
  max-height: var(--tool-sheet-menu-max-height);
  overflow-y: auto;
  border-bottom: 1px solid #f0f0f0;
`;

const SheetPanelHost = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
`;

const SheetPanelMenu = styled(Menu)`
  && {
    border-inline-end: none;
    background: transparent;
  }
`;

const Sider: React.FC<{
  setHasOpenTool: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setHasOpenTool }) => {
  const { data } = useMap();
  const queryClient = useQueryClient();

  const [openEditLocationPanel, setOpenEditLocationPanel] = useAtom(
    EditLocationPanelSwitch,
  );
  const [quickEditLocationPanel, setQuickEditLocationPanel] = useAtom(
    QuickEditLocationPanelSwitch,
  );
  const [showAllLocationListTable, setShowAllLocationListTable] = useAtom(
    EditLocationListTableSwitch,
  );

  const [openEditRoadPanel, setOpenEditRoadPanel] =
    useAtom(EditRoadPanelSwitch);
  const [showAllRoadListTable, setShowAllRoadListTable] =
    useAtom(RoadListTableSwitch);
  const [quickEditRoad, setQuickEditRoadPanel] = useAtom(QuickEditRoadSwitch);

  const [openEditZone, setOpenEditZone] = useAtom(EditZoneSwitch);
  const [showAllZones, setShowAllZones] = useAtom(showAllZonesSwitch);
  const [showZonesTable, setShowZonesTable] = useAtom(showZonesTableSwitch);

  const [openEditShelfPanel, setOpenEditShelf] = useAtom(EditShelfPanelSwitch);
  const [openEditShelfCategory, setOpenEditShelfCategory] = useAtom(
    EditShelfCategoryPanelSwitch,
  );
  const [openYawTable, setOpenYawTable] = useAtom(EditShelfYawPanelSwitch);

  const [openMissionPanel, setOpenMissionPanel] = useAtom(isShowEditMission);
  const [openChargeMissionPanel, setOpenChargeMissionPanel] = useAtom(
    isShowEditChargeMission,
  );

  const [
    openBeforeLeftStationMissionPanel,
    setOpenBeforeLeftStationMissionPanel,
  ] = useAtom(isShowEditBeforeLeftChargeStationMission);
  const [openScheduleMissionPanel, setOpenScheduleMissionPanel] = useAtom(
    isShowEditScheduleMission,
  );
  const [openIdleMissionPanel, setOpenIdleMissionPanel] = useAtom(
    isShowEditIdleMission,
  );
  const [openTopicMissionPanel, setOpenTopicMissionPanel] = useAtom(
    isShowEditTopicMission,
  );
  const [openEditAbortCargoMissionPanel, setEditAbortCargoMissionPanel] =
    useAtom(isShowEditAbortMissionWhenHasCargoMission);

  const [openRegisterAMR, setOpenRegisterAMR] = useAtom(isShowRegisterAMR);
  const [openAMRConfig, setOpenAMRConfig] = useAtom(isShowAMRConfig);

  const [openTagMissionPanel, setOpenTagMissionPanel] =
    useAtom(isShowEditMissionTag);
  const [openEditChargeStationIconPanel, setOpenEditChargeStationIconPanel] =
    useAtom(isShowEditChargeStationPosition);

  const [openEditChargeDockConfigPanel, setOpenEditChargeDockConfigPanel] =
    useAtom(isShowChargeStationDockConfig);

  const [openCustomCargoFormat, setOpenCustomCargoFormat] = useAtom(
    isShowEditCustomCargoFormat,
  );
  const [openContainerTable, setOpenContainerTable] =
    useAtom(isShowContainerTable);

  const [openWarningId, setOpenWarningId] = useAtom(isShowEditWarningId);
  const [OpenUploadWarningIDModal, setOpenUploadWarningIDModal] = useAtom(
    isOpenUploadWarningIDModal,
  );
  const [openImportMapConfig, setImportMapConfig] = useState(false);
  const [openBackup, setOpenBackup] = useAtom(isShowEditBackup);
  const [openStartPoint, setOpenStartPoint] = useState(false);

  const [openSwitchMap, setOpenSwitchMap] = useAtom(isOpenSwitchMap);
  const [openMapGroupTable, setOpenMapGroupTable] =
    useAtom(isShowMapGroupTable);

  const setShowLocationToolTip = useSetAtom(isShowLocationTooltip);

  const [openPeripheralNameMap, setOpenPeripheralNameMap] = useAtom(
    isShowPeripheralNameTable,
  );
  const [openPeripheralGroupMap, setOpenPeripheralGroupMap] = useAtom(
    isShowPeripheralGroupTable,
  );

  const [openBlindMis, setOpenBlindMis] = useAtom(
    isShowEditBlindLocationMission,
  );

  const [showSystemAlarm, setShowSystemAlarm] = useAtom(isShowSystemAlarm);

  const [showFootprint, setShowFootprint] = useAtom(isHowFootprint);
  const [showSound, setShowSound] = useAtom(isShowSound);

  const [collapsed, setCollapsed] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(
    null,
  );

  const [markerType, setShowMarkerType] = useAtom(isShowMarketType);

  const sheetTabsRef = useRef<HTMLDivElement>(null);
  const setToolSheetPanelHost = useSetAtom(toolSheetPanelHost);
  const panelHostRef = useCallback(
    (node: HTMLDivElement | null) => setToolSheetPanelHost(node),
    [setToolSheetPanelHost],
  );
  const sheetDragRef = useRef<{
    startY: number;
    startHeight: number;
    wrapper: HTMLElement;
    minHeight: number;
    maxHeight: number;
  } | null>(null);
  const { t } = useTranslation();
  const isWeb = useIsWebMediaQuery();
  useEffect(() => {
    const isOpen = [
      openEditLocationPanel,
      showAllLocationListTable,
      quickEditLocationPanel,
      openEditRoadPanel,
      showAllRoadListTable,
      openEditZone,
      showZonesTable,
      openEditShelfPanel,
      openEditShelfCategory,
      openYawTable,
      openMissionPanel,
      openChargeMissionPanel,
      openBeforeLeftStationMissionPanel,
      openScheduleMissionPanel,
      openIdleMissionPanel,
      openTopicMissionPanel,
      openEditAbortCargoMissionPanel,
      openTagMissionPanel,
      openEditChargeStationIconPanel,
      openContainerTable,
      openCustomCargoFormat,
      openRegisterAMR,
      openAMRConfig,
      openWarningId,
      openBackup,
      quickEditRoad,
      openPeripheralNameMap,
      openPeripheralGroupMap,
      openBlindMis,
      showSystemAlarm,
      openSwitchMap,
      openMapGroupTable,
      openEditChargeDockConfigPanel,
      showFootprint,
      showSound,
      markerType,
    ].some((item) => item);

    setHasOpenTool(isOpen);
  }, [
    openEditLocationPanel,
    showAllLocationListTable,
    quickEditLocationPanel,
    openEditRoadPanel,
    showAllRoadListTable,
    openEditZone,
    showZonesTable,
    openEditShelfPanel,
    openEditShelfCategory,
    openYawTable,
    openMissionPanel,
    openChargeMissionPanel,
    openBeforeLeftStationMissionPanel,
    openScheduleMissionPanel,
    openIdleMissionPanel,
    openTopicMissionPanel,
    openEditAbortCargoMissionPanel,
    openTagMissionPanel,
    openEditChargeStationIconPanel,
    openContainerTable,
    openCustomCargoFormat,
    openRegisterAMR,
    openAMRConfig,
    openWarningId,
    openBackup,
    quickEditRoad,
    openPeripheralNameMap,
    openPeripheralGroupMap,
    openBlindMis,
    showSystemAlarm,
    openSwitchMap,
    openMapGroupTable,
    openEditChargeDockConfigPanel,
    showFootprint,
    showSound,
    markerType,
  ]);

  const handleShowPanel = async (check: boolean, itemType: ToolBarItemType) => {
    if (!data) return;
    switch (itemType) {
      // === location ===
      case "location_panel":
        setOpenEditLocationPanel(check);
        break;
      case "quick_location_panel":
        setQuickEditLocationPanel(check);
        break;
      case "location_list":
        setShowAllLocationListTable(check);
        setShowLocationToolTip(true);

        break;
      // ===================
      // === road ===
      case "road_panel":
        setOpenEditRoadPanel(check);
        break;
      case "show_roads_table":
        setShowAllRoadListTable(check);
        break;
      case "quick_road_panel":
        setQuickEditRoadPanel(check);
        break;
      // ===================

      // === zone ===
      case "edit_zone":
        setOpenEditZone(check);
        break;
      case "show_zone_list":
        setShowAllZones(check);
        break;
      case "show_zone_table":
        setShowZonesTable(check);
        break;
      // ===================
      // === shelves ===
      // === shelf ===

      case "edit_shelve":
        await queryClient.refetchQueries({ queryKey: ["shelf"] });
        setOpenEditShelf(check);
        break;
      case "edit_shelve_type":
        await queryClient.refetchQueries({ queryKey: ["all-shelf-category"] });
        setOpenEditShelfCategory(check);
        break;
      case "edit_yaw":
        await queryClient.refetchQueries({ queryKey: ["yaw"] });
        setOpenYawTable(check);
        break;

      // ===================

      // ===================
      // === missions ===

      case "edit_mission":
        setOpenMissionPanel(check);
        break;

      case "charge_mission":
        setOpenChargeMissionPanel(check);
        break;

      case "before_left_charge_station_task":
        setOpenBeforeLeftStationMissionPanel(check);
        break;

      case "idle_mission":
        setOpenIdleMissionPanel(check);
        break;

      case "schedule_mission":
        setOpenScheduleMissionPanel(check);
        break;

      case "topic_mission":
        setOpenTopicMissionPanel(check);
        break;

      case "abort_cargo_mission":
        setEditAbortCargoMissionPanel(check);
        break;

      case "container_table":
        setOpenContainerTable(check);
        break;

      // ===================
      // === peripheral ===
      case "peripheral_name_table":
        setOpenPeripheralNameMap(check);
        break;

      case "peripheral_group_table":
        setOpenPeripheralGroupMap(check);
        break;

      case "peripheral_charge_dock_config":
        setOpenEditChargeDockConfigPanel(check);
        break;

      case "blind_mission":
        setOpenBlindMis(check);
        break;

      // ===================
      // === amr robot ===

      case "edit_register_amr":
        setOpenRegisterAMR(check);
        break;
      case "edit_amr_config":
        setOpenAMRConfig(check);
        break;
      // ===================
      // === others ===
      // case 'edit_gauge':
      //   console.log('edit_gauge')
      //   break
      case "edit_tag":
        setOpenTagMissionPanel(check);
        break;
      case "edit_icon_style":
        setOpenEditChargeStationIconPanel(check);
        break;

      case "custom_cargo_info":
        setOpenCustomCargoFormat(check);
        break;
      // ===================
      // === file ===
      case "warning_id":
        setOpenWarningId(check);
        break;
      case "upload_warning_file":
        setOpenUploadWarningIDModal(check);
        break;
      case "backup_file":
        setOpenBackup(check);
        break;
      case "show_system_alarm":
        setShowSystemAlarm(check);
        break;
      case "switch_map":
        setOpenSwitchMap(check);
        break;
      case "map_group_table":
        setOpenMapGroupTable(check);
        break;
      case "footprint":
        setShowFootprint(check);
        break;
      case "sound":
        setShowSound(check);
        break;

      case "marker_type":
        setShowMarkerType(check);
        break;

      //=======
    }
  };

  const toolItem: MenuItem[] = [
    getItem(
      t("toolbar.location.edit_locations"),
      "1",
      <AimOutlined className="location_icon" />,
      [
        getItem(
          t("toolbar.location.edit_locations"),
          "1-1",
          <Switch
            onChange={(checked) => handleShowPanel(checked, "location_panel")}
            checked={openEditLocationPanel}
          />,
        ),
        // getItem(
        //   t("toolbar.location.quick_edit_locations"),
        //   "1-2",
        //   <Switch
        //     onChange={(checked) =>
        //       handleShowPanel(checked, "quick_location_panel")
        //     }
        //     checked={quickEditLocationPanel}
        //   />,
        // ),
        getItem(
          t("toolbar.location.show_locations_table"),
          "1-4",
          <Switch
            checked={showAllLocationListTable}
            onChange={(checked) => handleShowPanel(checked, "location_list")}
          />,
        ),
      ],
    ),
    getItem(
      t("toolbar.road.roads.roads"),
      "2",
      <NodeIndexOutlined className="road_icon" />,
      [
        getItem(
          t("toolbar.road.roads.edit_roads"),
          "2-1",
          <Switch
            onChange={(checked) => handleShowPanel(checked, "road_panel")}
            checked={openEditRoadPanel}
          />,
        ),
        getItem(
          t("toolbar.road.roads.show_roads_table"),
          "2-2",
          <Switch
            checked={showAllRoadListTable}
            onChange={(checked) => handleShowPanel(checked, "show_roads_table")}
          />,
        ),
        getItem(
          t("toolbar.road.roads.quick_edit_road"),
          "2-3",
          <Switch
            checked={quickEditRoad}
            onChange={(checked) => handleShowPanel(checked, "quick_road_panel")}
          />,
        ),
      ],
    ),
    getItem(
      t("toolbar.zone.zones.zones"),
      "3",
      <BorderOuterOutlined className="zone_icon" />,
      [
        getItem(
          t("toolbar.zone.zones.edit_zone"),
          "3-1",
          <Switch
            value={openEditZone}
            onChange={(checked) => handleShowPanel(checked, "edit_zone")}
          />,
        ),
        getItem(
          t("toolbar.zone.zones.show_zone_list"),
          "3-2",
          <Switch
            value={showAllZones}
            onChange={(checked) => handleShowPanel(checked, "show_zone_list")}
          />,
        ),
        getItem(
          t("toolbar.zone.zones.show_zone_table"),
          "3-3",
          <Switch
            value={showZonesTable}
            onChange={(checked) => handleShowPanel(checked, "show_zone_table")}
          />,
        ),
      ],
    ),
    getItem(
      t("toolbar.shelve.shelves.shelves&pallet"),
      "4",
      <GoldOutlined className="shelve_icon" />,
      [
        getItem(
          t("toolbar.shelve.shelves.edit_shelve"),
          "4-1",
          <Switch
            checked={openEditShelfPanel}
            onChange={(checked) => handleShowPanel(checked, "edit_shelve")}
          />,
        ),
        getItem(
          t("toolbar.shelve.shelves.edit_shelve_type"),
          "4-2",
          <Switch
            checked={openEditShelfCategory}
            onChange={(checked) => handleShowPanel(checked, "edit_shelve_type")}
          />,
        ),
        getItem(
          t("toolbar.shelve.shelves.edit_yaw"),
          "4-3",
          <Switch
            checked={openYawTable}
            onChange={(checked) => handleShowPanel(checked, "edit_yaw")}
          />,
        ),
        // getItem(
        //   t('toolbar.shelve.shelves.edit_pallet'),
        //   '4-4',
        //   <Switch
        //     checked={openPalletTable}
        //     onChange={(checked) => handleShowPanel(checked, 'edit_pallet')}
        //   />
        // )
      ],
    ),
    getItem(t("toolbar.amr_setting.robot"), "5", <CarOutlined />, [
      getItem(
        t("toolbar.amr_setting.amr_config"),
        "5-2",
        <Switch
          checked={openAMRConfig}
          onChange={(checked) => handleShowPanel(checked, "edit_amr_config")}
        />,
      ),
      getItem(
        t("toolbar.amr_setting.register_amr"),
        "5-1",
        <Switch
          checked={openRegisterAMR}
          onChange={(checked) => handleShowPanel(checked, "edit_register_amr")}
        />,
      ),
    ]),
    getItem(t("toolbar.mission.mission"), "6", <ScheduleOutlined />, [
      getItem(
        t("toolbar.mission.edit_mission"),
        "6-1",
        <Switch
          checked={openMissionPanel}
          onChange={(checked) => handleShowPanel(checked, "edit_mission")}
        />,
      ),

      getItem(
        t("toolbar.mission.charge_mission"),
        "6-2",
        <Switch
          checked={openChargeMissionPanel}
          onChange={(checked) => handleShowPanel(checked, "charge_mission")}
        />,
      ),

      getItem(
        t("toolbar.mission.before_left_charge_station_mission"),
        "6-4",
        <Switch
          onChange={(checked) =>
            handleShowPanel(checked, "before_left_charge_station_task")
          }
          checked={openBeforeLeftStationMissionPanel}
        />,
      ),

      getItem(
        t("toolbar.mission.schedule_mission"),
        "6-5",
        <Switch
          defaultChecked={false}
          onChange={(checked) => handleShowPanel(checked, "schedule_mission")}
          checked={openScheduleMissionPanel}
        />,
      ),

      getItem(
        t("toolbar.mission.idle_mission"),
        "6-6",
        <Switch
          checked={openIdleMissionPanel}
          onChange={(checked) => handleShowPanel(checked, "idle_mission")}
        />,
      ),

      getItem(
        t("toolbar.mission.topic_mission"),
        "6-7",
        <Switch
          checked={openTopicMissionPanel}
          onChange={(checked) => handleShowPanel(checked, "topic_mission")}
        />,
      ),
      getItem(
        t("toolbar.mission.abort_mission_when_has_cargo_mission"),
        "6-8",
        <Switch
          checked={openEditAbortCargoMissionPanel}
          onChange={(checked) =>
            handleShowPanel(checked, "abort_cargo_mission")
          }
        />,
      ),
      getItem(
        t("toolbar.mission.blind_mission"),
        "6-9",
        <Switch
          checked={openBlindMis}
          onChange={(checked) => handleShowPanel(checked, "blind_mission")}
        />,
      ),
    ]),

    getItem(t("toolbar.peripheral.title"), "7", <DeploymentUnitOutlined />, [
      getItem(
        t("toolbar.peripheral.name_table"),
        "7-1",
        <Switch
          checked={openPeripheralNameMap}
          onChange={(checked) =>
            handleShowPanel(checked, "peripheral_name_table")
          }
        />,
      ),
      getItem(
        t("toolbar.peripheral.group_table"),
        "7-2",
        <Switch
          checked={openPeripheralGroupMap}
          onChange={(checked) =>
            handleShowPanel(checked, "peripheral_group_table")
          }
        />,
      ),

      getItem(
        t("toolbar.others.edit_peripheral_style"),
        "7-3",
        <Switch
          checked={openEditChargeStationIconPanel}
          onChange={(checked) => handleShowPanel(checked, "edit_icon_style")}
        />,
      ),

      getItem(
        t("toolbar.others.charge_dock_config"),
        "7-4",
        <Switch
          checked={openEditChargeDockConfigPanel}
          onChange={(checked) =>
            handleShowPanel(checked, "peripheral_charge_dock_config")
          }
        />,
      ),
    ]),

    getItem(t("toolbar.others.others"), "8", <DeploymentUnitOutlined />, [
      getItem(
        t("toolbar.others.edit_tag"),
        "8-1",
        <Switch
          checked={openTagMissionPanel}
          onChange={(checked) => handleShowPanel(checked, "edit_tag")}
        />,
      ),

      getItem(
        t("toolbar.others.custom_cargo_info"),
        "8-2",
        <Switch
          checked={openCustomCargoFormat}
          onChange={(checked) => handleShowPanel(checked, "custom_cargo_info")}
        />,
      ),

      getItem(
        t("toolbar.others.container_table"),
        "8-3",
        <Switch
          checked={openContainerTable}
          onChange={(checked) => handleShowPanel(checked, "container_table")}
        />,
      ),
    ]),
    getItem(t("toolbar.map_setting.map_setting"), "10", <PictureOutlined />, [
      getItem(
        t("toolbar.map_setting.switch_map"),
        "10-1",
        <Switch
          checked={openSwitchMap}
          onChange={(checked) => handleShowPanel(checked, "switch_map")}
        />,
      ),
      getItem(
        t("toolbar.map_setting.map_group"),
        "10-2",
        <Switch
          checked={openMapGroupTable}
          onChange={(checked) => handleShowPanel(checked, "map_group_table")}
        />,
      ),
    ]),
    getItem(t("toolbar.file_setting.file_setting"), "9", <FileOutlined />, [
      getItem(
        t("toolbar.file_setting.warning_id"),
        "9-1",
        <Switch
          checked={openWarningId}
          onChange={(checked) => handleShowPanel(checked, "warning_id")}
        />,
      ),
      getItem(
        t("toolbar.file_setting.upload_warning_file"),
        "9-2",
        <Switch
          checked={OpenUploadWarningIDModal}
          onChange={(checked) =>
            handleShowPanel(checked, "upload_warning_file")
          }
        />,
      ),
      getItem(
        t("toolbar.file_setting.system_alarm"),
        "9-7",
        <Switch
          checked={showSystemAlarm}
          onChange={(checked) => handleShowPanel(checked, "show_system_alarm")}
        />,
      ),
      getItem(
        t("toolbar.file_setting.start_point"),
        "9-3",
        <BorderOuterOutlined />,
      ),
      getItem(
        t("toolbar.file_setting.import_map"),
        "9-5",
        <DeliveredProcedureOutlined />,
      ),
      getItem(t("toolbar.restart.restart"), "9-6", <RedoOutlined />),
    ]),

    getItem("MIR", "12", <FileOutlined />, [
      getItem(
        "footprint",
        "12-1",
        <Switch
          checked={showFootprint}
          onChange={(checked) => handleShowPanel(checked, "footprint")}
        />,
      ),
      getItem(
        "sound",
        "12-2",
        <Switch
          checked={showSound}
          onChange={(checked) => handleShowPanel(checked, "sound")}
        />,
      ),

      getItem(
        "sound",
        "12-2",
        <Switch
          checked={showSound}
          onChange={(checked) => handleShowPanel(checked, "sound")}
        />,
      ),

      getItem(
        "marker_type",
        "12-3",
        <Switch
          checked={markerType}
          onChange={(checked) => handleShowPanel(checked, "marker_type")}
        />,
      ),
    ]),
  ];

  const [messageApi, contextHolders] = message.useMessage();
  const restartMutate = useMutation({
    mutationFn: () => {
      return client.post("api/setting/restart");
    },
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleRestart = (keyPath: Array<string>) => {
    const key = keyPath[0];
    switch (key) {
      case "9-6":
        restartMutate.mutate();
        setTimeout(() => {
          window.location.reload();
        }, 6000);
        return;
      case "9-3":
        setOpenStartPoint(true);
        break;
      case "9-5":
        setImportMapConfig(true);
        break;
      default:
        break;
    }
  };

  const handleSheetDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const wrapper = e.currentTarget.closest<HTMLElement>(
      ".ant-drawer-content-wrapper",
    );
    if (!wrapper) return;

    const header = wrapper.querySelector<HTMLElement>(".ant-drawer-header");
    const section = wrapper.querySelector<HTMLElement>(".ant-drawer-section");
    const maxHeight = section
      ? parseFloat(window.getComputedStyle(section).maxHeight)
      : NaN;

    sheetDragRef.current = {
      startY: e.clientY,
      startHeight: wrapper.getBoundingClientRect().height,
      wrapper,
      minHeight: header?.offsetHeight ?? 0,
      maxHeight: Number.isFinite(maxHeight) ? maxHeight : window.innerHeight,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSheetDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = sheetDragRef.current;
    if (!drag) return;

    // 往上拉（clientY 變小）代表變高
    const next = drag.startHeight - (e.clientY - drag.startY);
    drag.wrapper.style.setProperty(
      "--tool-sheet-height",
      `${Math.min(Math.max(next, drag.minHeight), drag.maxHeight)}px`,
    );
  };

  const handleSheetDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetDragRef.current) return;
    sheetDragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const toolCategories = toolItem as Array<{
    key: string;
    icon: React.ReactNode;
    label: React.ReactNode;
    children: MenuItem[];
  }>;
  const activeCategory = toolCategories.find(
    (category) => category.key === activeCategoryKey,
  );

  const handleSelectCategory = (key: string) => {
    const next = activeCategoryKey === key ? null : key;
    setActiveCategoryKey(next);

    if (!next) {
      sheetTabsRef.current
        ?.closest<HTMLElement>(".ant-drawer-content-wrapper")
        ?.style.removeProperty("--tool-sheet-height");
    }
  };

  return (
    <>
      {contextHolders}
      <DesktopSider
        collapsible
        width={230}
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        // className="setting-sider"
      >
        <Menu
          onClick={(e) => handleRestart(e.keyPath)}
          mode="inline"
          style={{ height: "100%", borderRight: 0, backgroundColor: "#ffffff" }}
          items={toolItem}
          className="setting-sider-menu"
        />
      </DesktopSider>

      {!isWeb && (
        <ToolSheet
          placement="bottom"
          open
          closable={false}
          defaultSize="var(--tool-sheet-height)"
          mask={false}
          title={
            <SheetHandle
              onPointerDown={handleSheetDragStart}
              onPointerMove={handleSheetDragMove}
              onPointerUp={handleSheetDragEnd}
              onPointerCancel={handleSheetDragEnd}
            />
          }
        >
          <SheetTabs ref={sheetTabsRef}>
            {toolCategories.map((category) => (
              <SheetTab
                key={category.key}
                type="button"
                $active={category.key === activeCategoryKey}
                onClick={() => handleSelectCategory(category.key)}
              >
                {category.icon}
                <span>{category.label}</span>
              </SheetTab>
            ))}
          </SheetTabs>

          {activeCategory && (
            <SheetCategoryPanel>
              <SheetPanelMenu
                onClick={(e) => handleRestart(e.keyPath)}
                mode="inline"
                selectable={false}
                items={activeCategory.children}
                className="setting-sider-menu"
              />
            </SheetCategoryPanel>
          )}

          <SheetPanelHost ref={panelHostRef} />
        </ToolSheet>
      )}

      {/**  -------- 錯誤表 --------  */}

      <ImportMapConfigModal
        setImportMapConfig={setImportMapConfig}
        openImportMapConfig={openImportMapConfig}
      ></ImportMapConfigModal>
      <StartPoint
        openStartPoint={openStartPoint}
        setOpenStartPoint={setOpenStartPoint}
      />
      <UploadWarningModal></UploadWarningModal>
    </>
  );
};

export default memo(Sider);
