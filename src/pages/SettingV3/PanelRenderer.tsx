import { FC, memo } from "react";
import useConfigFlags from "@/api/useConfigFlags";
import { navCategories } from "./navItems";
import { FormInstance } from "antd";
import LocationEditPanel from "@/pages/SettingV3/panels/location/LocationEditPanel";
import QuickLocationPanel from "@/pages/SettingV3/panels/location/QuickLocationPanel";
import RoadEditPanel from "@/pages/SettingV3/panels/road/RoadEditPanel";
import RoadQuickPanel from "@/pages/SettingV3/panels/road/RoadQuickPanel";
import RoadListPanel from "@/pages/SettingV3/panels/road/RoadListPanel";
import ZoneEditPanel from "@/pages/SettingV3/panels/zone/ZoneEditPanel";
import ZoneListPanel from "@/pages/SettingV3/panels/zone/ZoneListPanel";
import LocationListPanel from "@/pages/SettingV3/panels/location/LocationListPanel";
import ShelfEditPanel from "@/pages/SettingV3/panels/shelf/ShelfEditPanel";
import ShelfCategoryPanel from "@/pages/SettingV3/panels/shelf/ShelfCategoryPanel";
import YawPanel from "@/pages/SettingV3/panels/shelf/YawPanel";
import RegisterAmrPanel from "@/pages/SettingV3/panels/amr/RegisterAmrPanel";
import AmrConfigPanel from "@/pages/SettingV3/panels/amr/AmrConfigPanel";
import ChargePanel from "@/pages/SettingV3/panels/mission/ChargePanel";
import BeforeLeftChargeStationPanel from "@/pages/SettingV3/panels/mission/BeforeLeftChargeStationPanel";
import BeforeEnterChargeStationPanel from "@/pages/SettingV3/panels/mission/BeforeEnterChargeStationPanel";
import SchedulePanel from "@/pages/SettingV3/panels/mission/SchedulePanel";
import SignalTriggerPanel from "@/pages/SettingV3/panels/mission/SignalTriggerPanel";
import IdleRulePanel from "@/pages/SettingV3/panels/mission/IdleRulePanel";
import StandbyDemandPanel from "@/pages/SettingV3/panels/mission/StandbyDemandPanel";
import TopicMissionPanel from "@/pages/SettingV3/panels/mission/TopicMissionPanel";
import AbortCargoMissionPanel from "@/pages/SettingV3/panels/mission/AbortCargoMissionPanel";
import BlindLocationPanel from "@/pages/SettingV3/panels/mission/BlindLocationPanel";
import PeripheralNamePanel from "@/pages/SettingV3/panels/peripheral/PeripheralNamePanel";
import PeripheralGroupPanel from "@/pages/SettingV3/panels/peripheral/PeripheralGroupPanel";
import StackBatchPanel from "@/pages/SettingV3/panels/peripheral/StackBatchPanel";
import ConveyorDispatchPanel from "@/pages/SettingV3/panels/peripheral/ConveyorDispatchPanel";
import DispatchStrategyPanel from "@/pages/SettingV3/panels/peripheral/DispatchStrategyPanel";
import TransferRulePanel from "@/pages/SettingV3/panels/peripheral/TransferRulePanel";
import GroupPickPlacePanel from "@/pages/SettingV3/panels/peripheral/GroupPickPlacePanel";
import BookingTimingPanel from "@/pages/SettingV3/panels/peripheral/BookingTimingPanel";
import WorkAreaPanel from "@/pages/SettingV3/panels/peripheral/WorkAreaPanel";
import ChargeDockPanel from "@/pages/SettingV3/panels/peripheral/ChargeDockPanel";
import PeripheralStylePanel from "@/pages/SettingV3/panels/peripheral/PeripheralStylePanel";
import AdvantechPanel from "@/pages/SettingV3/panels/peripheral/AdvantechPanel";
import TagPanel from "@/pages/SettingV3/panels/other/TagPanel";
import CustomCargoInfoPanel from "@/pages/SettingV3/panels/other/CustomCargoInfoPanel";
import ContainerTablePanel from "@/pages/SettingV3/panels/other/ContainerTablePanel";
import MapManagerPanel from "@/pages/SettingV3/panels/map/MapManagerPanel";
import MapGroupPanel from "@/pages/SettingV3/panels/map/MapGroupPanel";
import MapAnnotationPanel from "@/pages/SettingV3/panels/map/MapAnnotationPanel";
import ChangeLogPanel from "@/pages/SettingV3/panels/records/ChangeLogPanel";
import MaintenanceItemPanel from "@/pages/SettingV3/panels/amr/MaintenanceItemPanel";
import WarningListPanel from "@/pages/SettingV3/panels/file/WarningListPanel";
import SystemAlarmPanel from "@/pages/SettingV3/panels/file/SystemAlarmPanel";
import DiagnosticBundlePanel from "@/pages/SettingV3/panels/system/DiagnosticBundlePanel";
import SnapshotPanel from "@/pages/SettingV3/panels/system/SnapshotPanel";
import RestartPanel from "@/pages/SettingV3/panels/system/RestartPanel";
import VehicleVersionPanel from "./panels/system/VehicleVersionPanel";
import FootprintPanel from "@/pages/SettingV3/panels/mir/FootprintPanel";
import SoundPanel from "@/pages/SettingV3/panels/mir/SoundPanel";
import MarkerTypePanel from "@/pages/SettingV3/panels/mir/MarkerTypePanel";
import SyncDataPanel from "@/pages/SettingV3/panels/mir/SyncDataPanel";
import MirMissionPanel from "@/pages/SettingV3/panels/mir/MirMissionPanel";
import EditMissionPanel from "@/pages/SettingV3/panels/mission/edit/EditMissionPanel";
import AppearancePanel from "@/pages/SettingV3/panels/appearance/AppearancePanel";
import type { SettingV2PanelKey } from "./panelKeys";
import BackupPanel from "@/pages/SettingV3/panels/file/BackupPanel";
import { SETTING_NAV_VIEW_PERMISSION, usePermission } from "@/utils/permissions";

type Props = {
  activeKey: SettingV2PanelKey | null;
  locationPanelForm: FormInstance<unknown>;
  roadPanelForm: FormInstance<unknown>;
  zonePanelForm: FormInstance<unknown>;
};

/** MIR 分類底下的面板和其他分類裡標了 mirOnly 的; HAS_MIR: false 時就算 activeKey 指到也不畫 */
const MIR_PANEL_KEYS = new Set<string>(
  navCategories.flatMap((cat) =>
    cat.children
      .filter((leaf) => cat.key === "mir" || leaf.mirOnly)
      .map((leaf) => leaf.key),
  ),
);

/** 面板 key -> 左側分類 key */
const categoryOfPanel = (key: string) => navCategories.find((c) => c.children.some((l) => l.key === key))?.key;

const PanelRenderer: FC<Props> = ({
  activeKey,
  locationPanelForm,
  roadPanelForm,
  zonePanelForm,
}) => {
  const { data: configFlags } = useConfigFlags();
  const can = usePermission();
  if (!activeKey) return null;
  if (MIR_PANEL_KEYS.has(activeKey) && !configFlags?.hasMir) return null;
  // 功能權限: 沒有這個分類「看」的權限 (例如上次開著的面板, 之後被管理員關掉) 就不畫
  const viewNeed = SETTING_NAV_VIEW_PERMISSION[categoryOfPanel(activeKey) ?? ""];
  if (viewNeed && !can(viewNeed)) return null;

  switch (activeKey) {
    // ✅ 已改用 v2 重新設計的版本(灰黑白 + RWD)
    case "location_panel":
      return <LocationEditPanel locationPanelForm={locationPanelForm} />;
    case "quick_location_panel":
      return <QuickLocationPanel />;
    case "location_list":
      return <LocationListPanel />;
    // ✅ 已改用 v2 重新設計的版本(灰黑白 + RWD)
    case "road_panel":
      return <RoadEditPanel roadPanelForm={roadPanelForm} />;
    case "show_roads_table":
      return <RoadListPanel />;
    case "quick_road_panel":
      return <RoadQuickPanel />;
    case "edit_zone":
      return <ZoneEditPanel zonePanelForm={zonePanelForm} />;
    case "show_zone_table":
      return <ZoneListPanel />;
    case "edit_shelve":
      return <ShelfEditPanel />;
    case "edit_shelve_type":
      return <ShelfCategoryPanel />;
    case "edit_yaw":
      return <YawPanel />;
    case "edit_register_amr":
      return <RegisterAmrPanel />;
    case "edit_amr_config":
      return <AmrConfigPanel />;
    case "edit_mission":
      return <EditMissionPanel />;
    case "charge_mission":
      return <ChargePanel />;
    case "before_enter_charge_station_task":
      return <BeforeEnterChargeStationPanel />;
    case "before_left_charge_station_task":
      return <BeforeLeftChargeStationPanel />;
    case "schedule_mission":
      return <SchedulePanel />;
    case "signal_trigger":
      return <SignalTriggerPanel />;
    case "idle_mission":
      return <IdleRulePanel />;
    case "standby_demand":
      return <StandbyDemandPanel />;
    case "topic_mission":
      return <TopicMissionPanel />;
    case "abort_cargo_mission":
      return <AbortCargoMissionPanel />;
    case "blind_mission":
      return <BlindLocationPanel />;
    case "peripheral_name_table":
      return <PeripheralNamePanel />;
    case "peripheral_group_table":
      return <PeripheralGroupPanel />;
    case "stack_batch_edit":
      return <StackBatchPanel />;
    case "dispatch_strategy":
      return <DispatchStrategyPanel />;
    case "conveyor_dispatch":
      return <ConveyorDispatchPanel />;
    case "transfer_rules":
      return <TransferRulePanel />;
    case "group_pick_place":
      return <GroupPickPlacePanel />;
    case "booking_timing":
      return <BookingTimingPanel />;
    case "work_areas":
      return <WorkAreaPanel />;
    case "peripheral_charge_dock_config":
      return <ChargeDockPanel />;
    case "edit_tag":
      return <TagPanel />;
    case "edit_icon_style":
      return <PeripheralStylePanel />;
    case "advantech_serial":
      return <AdvantechPanel />;
    case "custom_cargo_info":
      return <CustomCargoInfoPanel />;
    case "warning_id":
      return <WarningListPanel />;
    case "backup_file":
      return <BackupPanel />;
    case "container_table":
      return <ContainerTablePanel />;
    case "show_system_alarm":
      return <SystemAlarmPanel />;
    case "switch_map":
      return <MapManagerPanel />;
    case "map_group_table":
      return <MapGroupPanel />;
    case "map_annotation":
      return <MapAnnotationPanel />;
    case "setting_change_log":
      return <ChangeLogPanel />;
    case "diagnostic_bundle":
      return <DiagnosticBundlePanel />;
    case "settings_snapshot":
      return <SnapshotPanel />;
    case "system_restart":
      return <RestartPanel />;
    case "vehicle_versions":
      return <VehicleVersionPanel />;
    case "maintenance_items":
      return <MaintenanceItemPanel />;
    case "footprint":
      return <FootprintPanel />;
    case "sound":
      return <SoundPanel />;
    case "marker_type":
      return <MarkerTypePanel />;
    case "sync_mir":
      return <SyncDataPanel />;
    case "mir_mission":
      return <MirMissionPanel />;
    case "appearance":
      return <AppearancePanel />;
    default:
      return null;
  }
};

export default memo(PanelRenderer);
