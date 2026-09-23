import { FC, memo } from "react";
import { FormInstance } from "antd";
import type { DraggableAttributes } from "@dnd-kit/core";
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
import SchedulePanel from "./panels/mission/SchedulePanel";
import IdleMissionPanel from "./panels/mission/IdleMissionPanel";
import TopicMissionPanel from "./panels/mission/TopicMissionPanel";
import AbortCargoMissionPanel from "./panels/mission/AbortCargoMissionPanel";
import BlindLocationPanel from "./panels/mission/BlindLocationPanel";
import PeripheralNamePanel from "./panels/peripheral/PeripheralNamePanel";
import PeripheralGroupPanel from "./panels/peripheral/PeripheralGroupPanel";
import StackBatchPanel from "./panels/peripheral/StackBatchPanel";
import ChargeDockPanel from "./panels/peripheral/ChargeDockPanel";
import PeripheralStylePanel from "./panels/peripheral/PeripheralStylePanel";
import TagPanel from "./panels/other/TagPanel";
import CustomCargoInfoPanel from "./panels/other/CustomCargoInfoPanel";
import ContainerTablePanel from "./panels/other/ContainerTablePanel";
import MapManagerPanel from "./panels/map/MapManagerPanel";
import MapGroupPanel from "./panels/map/MapGroupPanel";
import WarningListPanel from "./panels/file/WarningListPanel";
import SystemAlarmPanel from "./panels/file/SystemAlarmPanel";
import FootprintPanel from "./panels/mir/FootprintPanel";
import SoundPanel from "./panels/mir/SoundPanel";
import MarkerTypePanel from "./panels/mir/MarkerTypePanel";
import SyncDataPanel from "./panels/mir/SyncDataPanel";
import MirMissionPanel from "./panels/mir/MirMissionPanel";
import EditMissionPanel from "./panels/mission/edit/EditMissionPanel";
import type { ToolBarItemType } from "@/pages/Setting/components/siderElement";
import { BackupPanel } from "@/pages/Setting/formComponent/forms/file/backup";

// v1 的面板都吃 dnd-kit 的 attributes/listeners,但它們只被展開到面板標題上當拖曳
// 把手,沒有任何其他邏輯會讀它。v2 沒有拖曳,所以統一餵空值,面板照常渲染,
// 也就不用去動那 39 個既有元件。
const noopAttributes = {} as DraggableAttributes;
const noopListeners = undefined;

type Props = {
  activeKey: ToolBarItemType | null;
  locationPanelForm: FormInstance<unknown>;
  roadPanelForm: FormInstance<unknown>;
  zonePanelForm: FormInstance<unknown>;
};

const PanelRenderer: FC<Props> = ({
  activeKey,
  locationPanelForm,
  roadPanelForm,
  zonePanelForm,
}) => {
  if (!activeKey) return null;

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
    case "before_left_charge_station_task":
      return <BeforeLeftChargeStationPanel />;
    case "schedule_mission":
      return <SchedulePanel />;
    case "idle_mission":
      return <IdleMissionPanel />;
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
      return (
        <BackupPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "container_table":
      return <ContainerTablePanel />;
    case "show_system_alarm":
      return <SystemAlarmPanel />;
    case "switch_map":
      return <MapManagerPanel />;
    case "map_group_table":
      return <MapGroupPanel />;
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
    default:
      return null;
  }
};

export default memo(PanelRenderer);
