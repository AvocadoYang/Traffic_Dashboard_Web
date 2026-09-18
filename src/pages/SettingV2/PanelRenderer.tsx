import { FC, memo } from "react";
import { FormInstance } from "antd";
import type { DraggableAttributes } from "@dnd-kit/core";
import LocationEditPanel from "./panels/location/LocationEditPanel";
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
import type { ToolBarItemType } from "@/pages/Setting/components/siderElement";
import EditMissionPanel from "@/pages/Setting/formComponent/forms/missionComponents/editMission/MissionPanel";
import { EditTagPanel } from "@/pages/Setting/formComponent/forms/other/editTag";
import { EditWarningListPanel } from "@/pages/Setting/formComponent/forms/file/warningId";
import { BackupPanel } from "@/pages/Setting/formComponent/forms/file/backup";
import CustomCargoInfoPanel from "@/pages/Setting/formComponent/forms/other/customCargoInfo/CustomCargoInfoPanel";
import EditPeripheralIcon from "@/pages/Setting/formComponent/forms/other/editPeripheralIcon/EditPeripheralIcon";
import {
  PeripheralGroupPanel,
  PeripheralNamePanel,
} from "@/pages/Setting/components/peripherals";
import AllContainerTable from "@/pages/Setting/formComponent/forms/AllContainerTable";
import SystemAlarmPanel from "@/pages/Setting/formComponent/forms/missionComponents/editMission/SystemAlarmPanel";
import MapManager from "@/pages/Setting/components/ChangeMap/MapManager";
import { MapGroupPanel } from "@/pages/Setting/components/mapGroup";
import PeripheralChargeDockPanel from "@/pages/Setting/components/peripherals/PeripheralChargeDockPanel";
import FootprintPanel from "@/pages/Setting/formComponent/forms/missionComponents/mir/footprinter/FootprintPanel";
import SoundPanel from "@/pages/Setting/formComponent/forms/missionComponents/mir/sound/SoundPanel";
import MarkerTypePanel from "@/pages/Setting/formComponent/forms/missionComponents/mir/markerTypes/MarkerTypePanel";
import SyncDataPanel from "@/pages/Setting/formComponent/forms/missionComponents/mir/syncData/SyncDataPanel";
import MirMissionPanel from "@/pages/Setting/formComponent/forms/missionComponents/mir/missionTable/MirMissionPanel";
import EditMirMissionPanel from "@/pages/Setting/formComponent/forms/missionComponents/mir/editMirMission/MirMissionPanel";

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
      return (
        <EditMissionPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
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
      return (
        <PeripheralNamePanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "peripheral_group_table":
      return (
        <PeripheralGroupPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "peripheral_charge_dock_config":
      return (
        <PeripheralChargeDockPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_tag":
      return (
        <EditTagPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_icon_style":
      return (
        <EditPeripheralIcon
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "custom_cargo_info":
      return (
        <CustomCargoInfoPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "warning_id":
      return (
        <EditWarningListPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "backup_file":
      return (
        <BackupPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "container_table":
      return (
        <AllContainerTable
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "show_system_alarm":
      return (
        <SystemAlarmPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "switch_map":
      return (
        <MapManager
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "map_group_table":
      return (
        <MapGroupPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "footprint":
      return (
        <FootprintPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "sound":
      return (
        <SoundPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "marker_type":
      return (
        <MarkerTypePanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "sync_mir":
      return (
        <SyncDataPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "mir_mission":
      return (
        <MirMissionPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "mir_edit_mission":
      return (
        <EditMirMissionPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    default:
      return null;
  }
};

export default memo(PanelRenderer);
