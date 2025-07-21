import { FC, memo } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import './utils.css';
import { useSetAtom } from 'jotai';
import {
  EditLocationPanelSwitch,
  QuickEditLocationPanelSwitch,
  EditLocationListTableSwitch,
  EditRoadPanelSwitch,
  RoadListTableSwitch,
  EditZoneSwitch,
  showAllZonesSwitch,
  showZonesTableSwitch,
  EditShelfPanelSwitch,
  EditShelfCategoryPanelSwitch,
  EditShelfYawPanelSwitch,
  isShowEditMission,
  isShowEditChargeMission,
  isShowEditCycleMission,
  isShowEditBeforeLeftChargeStationMission,
  isShowEditScheduleMission,
  isShowEditIdleMission,
  isShowEditTopicMission,
  isShowEditMissionTag,
  isShowEditChargeStationPosition,
  isShowEditWarningId,
  isOpenUploadWarningIDModal,
  isShowEditBackup,
  QuickEditRoadSwitch,
  isShowRegisterAMR,
  isShowEditAbortMissionWhenHasCargoMission,
  isShowEditCustomCargoFormat
} from '@/utils/siderGloble';
import { ToolBarItemType } from '../components/siderElement';

const FormCloseBtn: FC<{ sortableId: string; panelName: ToolBarItemType }> = ({ panelName }) => {
  const setOpenEditLocationPanel = useSetAtom(EditLocationPanelSwitch); // 1-1
  const setQuickEditLocationPanel = useSetAtom(QuickEditLocationPanelSwitch); // 1-2
  const setShowAllLocationListTable = useSetAtom(EditLocationListTableSwitch); // 1-4
  const setOpenEditRoadPanel = useSetAtom(EditRoadPanelSwitch); // 2-1
  const setShowAllRoadListTable = useSetAtom(RoadListTableSwitch); // 2-2
  const setQuickEditRoadPanel = useSetAtom(QuickEditRoadSwitch); // 2-3

  const setOpenEditZone = useSetAtom(EditZoneSwitch); // 3-1
  const setShowAllZones = useSetAtom(showAllZonesSwitch); // 3-2
  const setShowZonesTable = useSetAtom(showZonesTableSwitch); // 3-3

  const setOpenEditShelf = useSetAtom(EditShelfPanelSwitch); //4-1
  const setOpenEditShelfCategory = useSetAtom(EditShelfCategoryPanelSwitch); //4-2
  const setOpenYawTable = useSetAtom(EditShelfYawPanelSwitch); //4-3

  const setOpenRegisterAmr = useSetAtom(isShowRegisterAMR);

  const setOpenMissionPanel = useSetAtom(isShowEditMission); // 5-1
  const setOpenChargeMissionPanel = useSetAtom(isShowEditChargeMission); // 5-2
  const setOpenCycleMissionPanel = useSetAtom(isShowEditCycleMission); // 5-3
  const setOpenBeforeLeftStationMissionPanel = useSetAtom(isShowEditBeforeLeftChargeStationMission); // 5-4
  const setOpenScheduleMissionPanel = useSetAtom(isShowEditScheduleMission); // 5-5
  const setOpenIdleMissionPanel = useSetAtom(isShowEditIdleMission); // 5-6
  const setOpenTopicMissionPanel = useSetAtom(isShowEditTopicMission); // 5-7
  const setOpenAbortMissionPanel = useSetAtom(isShowEditAbortMissionWhenHasCargoMission);
  const setOpenTagMissionPanel = useSetAtom(isShowEditMissionTag); // 6-1
  const setOpenEditChargeStationIconPanel = useSetAtom(isShowEditChargeStationPosition); // 6-2
  const setOpenCustomCargoInfoPanel = useSetAtom(isShowEditCustomCargoFormat); // 6-3
  const setOpenWarningId = useSetAtom(isShowEditWarningId); // 7-1
  const setOpenUploadWarningIDModal = useSetAtom(isOpenUploadWarningIDModal); //7-2
  const setOpenBackup = useSetAtom(isShowEditBackup); // 7-3

  const handleClose = () => {
    switch (panelName) {
      case 'location_panel':
        setOpenEditLocationPanel(false);
        break;
      case 'quick_location_panel':
        setQuickEditLocationPanel(false);
        break;
      case 'location_list':
        setShowAllLocationListTable(false);
        break;
      case 'road_panel':
        setOpenEditRoadPanel(false);
        break;
      case 'show_roads_table':
        setShowAllRoadListTable(false);
        break;
      case 'quick_road_panel':
        setQuickEditRoadPanel(false);
        break;
      case 'edit_zone':
        setOpenEditZone(false);
        break;
      case 'show_zone_list':
        setShowAllZones(false);
        break;
      case 'show_zone_table':
        setShowZonesTable(false);
        break;
      case 'edit_shelve':
        setOpenEditShelf(false);
        break;
      case 'edit_shelve_type':
        setOpenEditShelfCategory(false);
        break;
      case 'edit_yaw':
        setOpenYawTable(false);
        break;

      case 'edit_mission':
        setOpenMissionPanel(false);
        break;
      case 'charge_mission':
        setOpenChargeMissionPanel(false);
        break;
      case 'cycle_mission':
        setOpenCycleMissionPanel(false);
        break;
      case 'before_left_charge_station_task':
        setOpenBeforeLeftStationMissionPanel(false);
        break;
      case 'schedule_mission':
        setOpenScheduleMissionPanel(false);
        break;
      case 'idle_mission':
        setOpenIdleMissionPanel(false);
        break;
      case 'topic_mission':
        setOpenTopicMissionPanel(false);
        break;
      case 'abort_cargo_mission':
        setOpenAbortMissionPanel(false);
        break;
      case 'edit_tag':
        setOpenTagMissionPanel(false);
        break;
      case 'edit_icon_style':
        setOpenEditChargeStationIconPanel(false);
        break;
      case 'warning_id':
        setOpenWarningId(false);
        break;
      case 'upload_warning_file':
        setOpenUploadWarningIDModal(false);
        break;
      case 'backup_file':
        setOpenBackup(false);
        break;
      case 'edit_register_amr':
        setOpenRegisterAmr(false);
        break;
      case 'custom_cargo_info':
        setOpenCustomCargoInfoPanel(false);
        break;
      case 'edit_amr_config':
      case 'shelf_mission':
      case 'todo_dependent_on_return_id_task':
      case 'edit_region_name':
        // No corresponding setters provided for these cases
        console.warn(`No handler for panel: ${panelName}`);
        break;
      default:
        console.warn(`Unknown panel name: ${panelName}`);
        break;
    }
  };

  return (
    <>
      <CloseOutlined
        onClick={() => handleClose()}
        className="form-close-btn"
        style={{ position: 'absolute', right: '1em', top: '1em' }}
      />
    </>
  );
};

export default memo(FormCloseBtn);
