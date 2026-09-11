import { FC, memo } from "react";
import { FormInstance } from "antd";
import type { DraggableAttributes } from "@dnd-kit/core";
import LocationEditPanel from "./panels/location/LocationEditPanel";
import LocationListPanel from "./panels/location/LocationListPanel";
import {
  EditRoadPanel,
  EditZonePanel,
  RoadList,
  ZoneTable,
} from "@/pages/Setting/formComponent/forms";
import type { ToolBarItemType } from "@/pages/Setting/components/siderElement";
import { ShelfPanel } from "@/pages/Setting/formComponent/forms/shelfComponents/editShelf";
import { ShelfCategoryPanel } from "@/pages/Setting/formComponent/forms/shelfComponents/category";
import { YawPanel } from "@/pages/Setting/formComponent/forms/shelfComponents/yaw";
import EditMissionPanel from "@/pages/Setting/formComponent/forms/missionComponents/editMission/MissionPanel";
import { ChargePanel } from "@/pages/Setting/formComponent/forms/missionComponents/chargeMission";
import { BeforeLeftChargeStationPanel } from "@/pages/Setting/formComponent/forms/missionComponents/beforLeftChargeStationMission";
import { SchedulePanel } from "@/pages/Setting/formComponent/forms/missionComponents/scheduleMission";
import { IdleMissionPanel } from "@/pages/Setting/formComponent/forms/missionComponents/idleMission";
import { TopicMissionPanel } from "@/pages/Setting/formComponent/forms/missionComponents/topicMission";
import { EditTagPanel } from "@/pages/Setting/formComponent/forms/other/editTag";
import { EditWarningListPanel } from "@/pages/Setting/formComponent/forms/file/warningId";
import { BackupPanel } from "@/pages/Setting/formComponent/forms/file/backup";
import { RegisterAmrPanel } from "@/pages/Setting/formComponent/forms/amrSetting/registerAmr";
import AmrConfigPanel from "@/pages/Setting/formComponent/forms/amrSetting/amrConfig/AmrConfigPanel";
import QuickEditRoadPanel from "@/pages/Setting/formComponent/QuickEditRoadPanel";
import { AbortCargoMissionPanel } from "@/pages/Setting/formComponent/forms/missionComponents/abortCargoMission";
import CustomCargoInfoPanel from "@/pages/Setting/formComponent/forms/other/customCargoInfo/CustomCargoInfoPanel";
import EditPeripheralIcon from "@/pages/Setting/formComponent/forms/other/editPeripheralIcon/EditPeripheralIcon";
import {
  PeripheralGroupPanel,
  PeripheralNamePanel,
} from "@/pages/Setting/components/peripherals";
import BlindLocationPanel from "@/pages/Setting/formComponent/forms/missionComponents/blindMission/BlindLocationPanel";
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
    case "road_panel":
      return (
        <EditRoadPanel
          sortableId={activeKey}
          roadPanelForm={roadPanelForm}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "show_roads_table":
      return (
        <RoadList
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "quick_road_panel":
      return (
        <QuickEditRoadPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_zone":
      return (
        <EditZonePanel
          sortableId={activeKey}
          zonePanelForm={zonePanelForm}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "show_zone_table":
      return (
        <ZoneTable
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_shelve":
      return (
        <ShelfPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_shelve_type":
      return (
        <ShelfCategoryPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_yaw":
      return (
        <YawPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_register_amr":
      return (
        <RegisterAmrPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_amr_config":
      return (
        <AmrConfigPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "edit_mission":
      return (
        <EditMissionPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "charge_mission":
      return (
        <ChargePanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "before_left_charge_station_task":
      return (
        <BeforeLeftChargeStationPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "schedule_mission":
      return (
        <SchedulePanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "idle_mission":
      return (
        <IdleMissionPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "topic_mission":
      return (
        <TopicMissionPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "abort_cargo_mission":
      return (
        <AbortCargoMissionPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
    case "blind_mission":
      return (
        <BlindLocationPanel
          sortableId={activeKey}
          attributes={noopAttributes}
          listeners={noopListeners}
        />
      );
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
