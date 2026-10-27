import { FC, memo } from "react";
import useConfigFlags from "@/api/useConfigFlags";
import { navCategories } from "./navItems";
import { FormInstance } from "antd";
import LocationEditPanel from "./panels/location/LocationEditPanel";
import QuickLocationPanel from "./panels/location/QuickLocationPanel";
import RoadEditPanel from "./panels/road/RoadEditPanel";
import RoadQuickPanel from "./panels/road/RoadQuickPanel";
import RoadListPanel from "./panels/road/RoadListPanel";
import ZoneEditPanel from "./panels/zone/ZoneEditPanel";
import ZoneListPanel from "./panels/zone/ZoneListPanel";
import LocationListPanel from "./panels/location/LocationListPanel";
import ShelfEditPanel from "./panels/shelf/ShelfEditPanel";
import ShelfCategoryPanel from "./panels/shelf/ShelfCategoryPanel";
import YawPanel from "./panels/shelf/YawPanel";
import RegisterAmrPanel from "./panels/amr/RegisterAmrPanel";
import AmrConfigPanel from "./panels/amr/AmrConfigPanel";
import ChargePanel from "./panels/mission/ChargePanel";
import BeforeLeftChargeStationPanel from "./panels/mission/BeforeLeftChargeStationPanel";
import BeforeEnterChargeStationPanel from "./panels/mission/BeforeEnterChargeStationPanel";
import SchedulePanel from "./panels/mission/SchedulePanel";
import IdleRulePanel from "./panels/mission/IdleRulePanel";
import TopicMissionPanel from "./panels/mission/TopicMissionPanel";
import AbortCargoMissionPanel from "./panels/mission/AbortCargoMissionPanel";
import BlindLocationPanel from "./panels/mission/BlindLocationPanel";
import PeripheralNamePanel from "./panels/peripheral/PeripheralNamePanel";
import PeripheralGroupPanel from "./panels/peripheral/PeripheralGroupPanel";
import StackBatchPanel from "./panels/peripheral/StackBatchPanel";
import ConveyorDispatchPanel from "./panels/peripheral/ConveyorDispatchPanel";
import DispatchStrategyPanel from "./panels/peripheral/DispatchStrategyPanel";
import GateInterlockPanel from "./panels/peripheral/GateInterlockPanel";
import TransferRulePanel from "./panels/peripheral/TransferRulePanel";
import WorkAreaPanel from "./panels/peripheral/WorkAreaPanel";
import ChargeDockPanel from "./panels/peripheral/ChargeDockPanel";
import PeripheralStylePanel from "./panels/peripheral/PeripheralStylePanel";
import TagPanel from "./panels/other/TagPanel";
import CustomCargoInfoPanel from "./panels/other/CustomCargoInfoPanel";
import ContainerTablePanel from "./panels/other/ContainerTablePanel";
import MapManagerPanel from "./panels/map/MapManagerPanel";
import MapGroupPanel from "./panels/map/MapGroupPanel";
import MapAnnotationPanel from "./panels/map/MapAnnotationPanel";
import ChangeLogPanel from "./panels/records/ChangeLogPanel";
import MaintenanceItemPanel from "./panels/amr/MaintenanceItemPanel";
import WarningListPanel from "./panels/file/WarningListPanel";
import SystemAlarmPanel from "./panels/file/SystemAlarmPanel";
import FootprintPanel from "./panels/mir/FootprintPanel";
import SoundPanel from "./panels/mir/SoundPanel";
import MarkerTypePanel from "./panels/mir/MarkerTypePanel";
import SyncDataPanel from "./panels/mir/SyncDataPanel";
import MirMissionPanel from "./panels/mir/MirMissionPanel";
import EditMissionPanel from "./panels/mission/edit/EditMissionPanel";
import AppearancePanel from "./panels/appearance/AppearancePanel";
import type { SettingV2PanelKey } from "./panelKeys";
import BackupPanel from "./panels/file/BackupPanel";

type Props = {
  activeKey: SettingV2PanelKey | null;
  locationPanelForm: FormInstance<unknown>;
  roadPanelForm: FormInstance<unknown>;
  zonePanelForm: FormInstance<unknown>;
};

/** MIR 分類底下的面板; HAS_MIR: false 時就算 activeKey 指到也不畫 */
const MIR_PANEL_KEYS = new Set<string>(
  navCategories.find((c) => c.key === "mir")?.children.map((c) => c.key) ?? [],
);

const PanelRenderer: FC<Props> = ({
  activeKey,
  locationPanelForm,
  roadPanelForm,
  zonePanelForm,
}) => {
  const { data: configFlags } = useConfigFlags();
  if (!activeKey) return null;
  if (MIR_PANEL_KEYS.has(activeKey) && !configFlags?.hasMir) return null;

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
    case "idle_mission":
      return <IdleRulePanel />;
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
    case "gate_interlock":
      return <GateInterlockPanel />;
    case "conveyor_dispatch":
      return <ConveyorDispatchPanel />;
    case "transfer_rules":
      return <TransferRulePanel />;
    case "work_areas":
      return <WorkAreaPanel />;
    case "peripheral_charge_dock_config":
      return <ChargeDockPanel />;
    case "edit_tag":
      return <TagPanel />;
    case "edit_icon_style":
      return <PeripheralStylePanel />;
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
