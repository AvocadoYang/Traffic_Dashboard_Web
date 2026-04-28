import { FC, memo } from "react";
import {
  AllLocationTable,
  EditLocationPanel,
  EditRoadPanel,
  EditZonePanel,
  QuickEditLocationPanel,
  RoadList,
  ZoneTable,
} from "../formComponent/forms";
import { Card, FormInstance } from "antd";
import {
  EditLocationListTableSwitch,
  EditLocationPanelSwitch,
  EditRoadPanelSwitch,
  EditShelfCategoryPanelSwitch,
  EditShelfPanelSwitch,
  EditShelfYawPanelSwitch,
  EditZoneSwitch,
  isShowAMRConfig,
  isShowContainerTable,
  isShowEditAbortMissionWhenHasCargoMission,
  isShowEditBackup,
  isShowEditBeforeLeftChargeStationMission,
  isShowEditBlindLocationMission,
  isShowEditChargeMission,
  isShowEditChargeStationPosition,
  isShowEditClampHeight,
  isShowEditCustomCargoFormat,
  isShowEditElevatorMission,
  isShowEditIdleMission,
  isShowEditMission,
  isShowEditMissionTag,
  isShowEditScheduleMission,
  isShowEditTopicMission,
  isShowEditWarningId,
  isShowPeripheralGroupTable,
  isShowPeripheralNameTable,
  isShowRegisterAMR,
  QuickEditLocationPanelSwitch,
  QuickEditRoadSwitch,
  RoadListTableSwitch,
  showZonesTableSwitch,
} from "@/utils/siderGloble";
import { useAtomValue } from "jotai";
import { ToolBarItemType, ToolBarType } from "./siderElement";
import { useSortable } from "@dnd-kit/sortable";
import cardStyle from "../utils/cardStyle";
import { ShelfPanel } from "../formComponent/forms/shelfComponents/editShelf";
import { ShelfCategoryPanel } from "../formComponent/forms/shelfComponents/category";
import { YawPanel } from "../formComponent/forms/shelfComponents/yaw";
import FormCloseBtn from "../utils/FormCloseBtn";
import EditMissionPanel from "../formComponent/forms/missionComponents/editMission/MissionPanel";
import { ChargePanel } from "../formComponent/forms/missionComponents/chargeMission";
import { BeforeLeftChargeStationPanel } from "../formComponent/forms/missionComponents/beforLeftChargeStationMission";
import { SchedulePanel } from "../formComponent/forms/missionComponents/scheduleMission";
import { IdleMissionPanel } from "../formComponent/forms/missionComponents/idleMission";
import { TopicMissionPanel } from "../formComponent/forms/missionComponents/topicMission";
import { EditTagPanel } from "../formComponent/forms/other/editTag";
import { EditWarningListPanel } from "../formComponent/forms/file/warningId";
import { BackupPanel } from "../formComponent/forms/file/backup";
import { RegisterAmrPanel } from "../formComponent/forms/amrSetting/registerAmr";
import AmrConfigPanel from "../formComponent/forms/amrSetting/amrConfig/AmrConfigPanel";
import QuickEditRoadPanel from "../formComponent/QuickEditRoadPanel";
import { AbortCargoMissionPanel } from "../formComponent/forms/missionComponents/abortCargoMission";
import CustomCargoInfoPanel from "../formComponent/forms/other/customCargoInfo/CustomCargoInfoPanel";
import EditPeripheralIcon from "../formComponent/forms/other/editPeripheralIcon/EditPeripheralIcon";
import { PeripheralGroupPanel, PeripheralNamePanel } from "./peripherals";
import ElevatorMissionPanel from "../formComponent/forms/file/corning/ElevatorMissionPanel";
import ClampHeightPanel from "../formComponent/forms/file/corning/ClampHeightPanel";
import BlindLocationPanel from "../formComponent/forms/missionComponents/blindMission/BlindLocationPanel";
import AllContainerTable from "../formComponent/forms/AllContainerTable";

const SortableWrap: FC<{
  sortableId: ToolBarItemType;
  locationPanelForm?: FormInstance<unknown>;
  roadPanelForm?: FormInstance<unknown>;
  zonePanelForm?: FormInstance<unknown>;
}> = ({ sortableId, locationPanelForm, roadPanelForm, zonePanelForm }) => {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({
      id: sortableId, //這裡的id必須和SortableContext的item裡的id對應
      transition: {
        duration: 500,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    });
  const styles = cardStyle(transform, transition, sortableId);
  return (
    <>
      {(() => {
        switch (sortableId) {
          // 1-1 編輯點位的彈跳視窗
          case "location_panel":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="location_panel"
                />
                <EditLocationPanel
                  sortableId={sortableId}
                  locationPanelForm={locationPanelForm as FormInstance<unknown>}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 1-2 快速編輯點位的彈跳視窗
          case "quick_location_panel":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="quick_location_panel"
                />
                <QuickEditLocationPanel
                  sortableId={sortableId}
                  locationPanelForm={locationPanelForm as FormInstance<unknown>}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 1-3 顯示地點列表
          case "location_list":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="location_list"
                />
                <AllLocationTable
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 2-1 編輯路徑
          case "road_panel":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn sortableId={sortableId} panelName="road_panel" />
                <EditRoadPanel
                  roadPanelForm={roadPanelForm as FormInstance<unknown>}
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 2-2 顯示路徑列表
          case "show_roads_table":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="show_roads_table"
                />
                <RoadList
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 2-3 顯示快速拉路線
          case "quick_road_panel":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="quick_road_panel"
                />
                <QuickEditRoadPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 3-1 編輯區域
          case "edit_zone":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn sortableId={sortableId} panelName="edit_zone" />
                <EditZonePanel
                  zonePanelForm={zonePanelForm as FormInstance<unknown>}
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 3-3 顯示區域表
          case "show_zone_table":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="show_zone_table"
                />
                <ZoneTable
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 4-1 顯示編輯貨架
          case "edit_shelve":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn sortableId={sortableId} panelName="edit_shelve" />
                <ShelfPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 4-2 顯示編輯類型
          case "edit_shelve_type":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="edit_shelve_type"
                />
                <ShelfCategoryPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 4-3 顯示編輯類型
          case "edit_yaw":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn sortableId={sortableId} panelName="edit_yaw" />
                <YawPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 5-1 顯示編輯註冊車輛
          case "edit_register_amr":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="edit_register_amr"
                />
                <RegisterAmrPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 5-2 顯示編輯類型
          case "edit_amr_config":
            return (
              <Card style={styles} ref={setNodeRef} key={sortableId}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="edit_amr_config"
                />
                <AmrConfigPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 6-1 顯示編輯任務
          case "edit_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="edit_mission"
                />
                <EditMissionPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 6-2 顯示充電任務
          case "charge_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="charge_mission"
                />
                <ChargePanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 6-4 顯示離開充電站前任務
          case "before_left_charge_station_task":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="before_left_charge_station_task"
                />
                <BeforeLeftChargeStationPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 6-5 顯示定時任務
          case "schedule_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="schedule_mission"
                />
                <SchedulePanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 6-6 顯示閒置任務
          case "idle_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="idle_mission"
                />
                <IdleMissionPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 6-7 顯示主題任務
          case "topic_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="topic_mission"
                />
                <TopicMissionPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          //6-8 縣市刪除任務身上有貨處理機制
          case "abort_cargo_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="abort_cargo_mission"
                />
                <AbortCargoMissionPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          //6-8 縣市刪除任務身上有貨處理機制
          case "blind_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="blind_mission"
                />
                <BlindLocationPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          case "peripheral_name_table":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="peripheral_name_table"
                />
                <PeripheralNamePanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          case "peripheral_group_table":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="peripheral_group_table"
                />
                <PeripheralGroupPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 7-1 顯示編輯標籤
          case "edit_tag":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn sortableId={sortableId} panelName="edit_tag" />
                <EditTagPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 7-2 顯示編輯充電站圖標樣式
          case "edit_icon_style":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="edit_icon_style"
                />
                <EditPeripheralIcon
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 7-3 顯示自定義貨物格式
          case "custom_cargo_info":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="custom_cargo_info"
                />
                <CustomCargoInfoPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 8-1 顯示編輯warning id
          case "warning_id":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn sortableId={sortableId} panelName="warning_id" />
                <EditWarningListPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 8-2 顯示編輯備份檔案
          case "backup_file":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn sortableId={sortableId} panelName="backup_file" />
                <BackupPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          //
          case "elevator_mission":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="elevator_mission"
                />
                <ElevatorMissionPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );

          // 8-2 顯示編輯備份檔案
          case "clamp_height":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="clamp_height"
                />
                <ClampHeightPanel
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          // 8-4 顯示貨物表格
          case "container_table":
            return (
              <Card style={styles} ref={setNodeRef}>
                <FormCloseBtn
                  sortableId={sortableId}
                  panelName="container_table"
                />
                <AllContainerTable
                  sortableId={sortableId}
                  attributes={attributes}
                  listeners={listeners}
                />
              </Card>
            );
          default:
            return null;
        }
      })()}
    </>
  );
};

const ToolComponents: FC<{
  locationPanelForm: FormInstance<unknown>;
  roadPanelForm: FormInstance<unknown>;
  zonePanelForm: FormInstance<unknown>;
  dataList: ToolBarType;
}> = ({ locationPanelForm, dataList, roadPanelForm, zonePanelForm }) => {
  const showEditLocationPanel = useAtomValue(EditLocationPanelSwitch);
  const showQuickEditLocationPanel = useAtomValue(QuickEditLocationPanelSwitch);
  const showAllLocationListTable = useAtomValue(EditLocationListTableSwitch);
  const openEditRoadPanel = useAtomValue(EditRoadPanelSwitch);
  const showRoadList = useAtomValue(RoadListTableSwitch);
  const showQuickEditRoad = useAtomValue(QuickEditRoadSwitch);

  const openZonePanel = useAtomValue(EditZoneSwitch);
  const openZoneTable = useAtomValue(showZonesTableSwitch);
  const openEditShelf = useAtomValue(EditShelfPanelSwitch);
  const openEditShelfCategory = useAtomValue(EditShelfCategoryPanelSwitch);
  const openEditShelfYaw = useAtomValue(EditShelfYawPanelSwitch);

  const openRegisterAmrPanel = useAtomValue(isShowRegisterAMR);
  const openAMRConfigPanel = useAtomValue(isShowAMRConfig);

  const openMissionPanel = useAtomValue(isShowEditMission);
  const openChargePanel = useAtomValue(isShowEditChargeMission);
  const openBLCSPanel = useAtomValue(isShowEditBeforeLeftChargeStationMission);
  const openSchedulePanel = useAtomValue(isShowEditScheduleMission);
  const openIdlePanel = useAtomValue(isShowEditIdleMission);
  const openTopicPanel = useAtomValue(isShowEditTopicMission);
  const openAbortCargoMission = useAtomValue(
    isShowEditAbortMissionWhenHasCargoMission,
  );
  const openBlindPanel = useAtomValue(isShowEditBlindLocationMission);

  const openPeripheralNamePanel = useAtomValue(isShowPeripheralNameTable);
  const openPeripheralGroupPanel = useAtomValue(isShowPeripheralGroupTable);

  const openTagPanel = useAtomValue(isShowEditMissionTag);
  const openChargeStylePanel = useAtomValue(isShowEditChargeStationPosition);
  const openCargoFormatPanel = useAtomValue(isShowEditCustomCargoFormat);
  const openContainerTablePanel = useAtomValue(isShowContainerTable);

  const openWarningPanel = useAtomValue(isShowEditWarningId);
  const openBackupPanel = useAtomValue(isShowEditBackup);

  const openElevatorMission = useAtomValue(isShowEditElevatorMission);
  const openClampHieght = useAtomValue(isShowEditClampHeight);

  return dataList.map((form) => {
    const { key: formKey } = form;

    if (formKey === "location_panel" && showEditLocationPanel) {
      return (
        <SortableWrap
          sortableId={formKey}
          key={formKey}
          locationPanelForm={locationPanelForm}
        ></SortableWrap>
      );
    }
    if (formKey === "location_list" && showAllLocationListTable) {
      return (
        <SortableWrap
          sortableId={formKey}
          key={formKey}
          locationPanelForm={locationPanelForm}
        ></SortableWrap>
      );
    }
    if (formKey === "quick_location_panel" && showQuickEditLocationPanel) {
      return (
        <SortableWrap
          sortableId={formKey}
          key={formKey}
          locationPanelForm={locationPanelForm}
        ></SortableWrap>
      );
    }
    if (formKey === "road_panel" && openEditRoadPanel) {
      return (
        <SortableWrap
          sortableId={formKey}
          key={formKey}
          locationPanelForm={locationPanelForm}
          roadPanelForm={roadPanelForm}
        ></SortableWrap>
      );
    }
    if (formKey === "show_roads_table" && showRoadList) {
      return (
        <SortableWrap
          sortableId={formKey}
          key={formKey}
          locationPanelForm={locationPanelForm}
          roadPanelForm={roadPanelForm}
        ></SortableWrap>
      );
    }
    if (formKey === "quick_road_panel" && showQuickEditRoad) {
      return (
        <SortableWrap
          sortableId={formKey}
          key={formKey}
          locationPanelForm={locationPanelForm}
          roadPanelForm={roadPanelForm}
        ></SortableWrap>
      );
    }
    if (formKey === "edit_zone" && openZonePanel) {
      return (
        <SortableWrap
          sortableId={formKey}
          key={formKey}
          zonePanelForm={zonePanelForm}
        ></SortableWrap>
      );
    }
    if (formKey === "show_zone_table" && openZoneTable) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "edit_shelve" && openEditShelf) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "edit_shelve_type" && openEditShelfCategory) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "edit_yaw" && openEditShelfYaw) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "edit_register_amr" && openRegisterAmrPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "edit_amr_config" && openAMRConfigPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "edit_mission" && openMissionPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "charge_mission" && openChargePanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "before_left_charge_station_task" && openBLCSPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "schedule_mission" && openSchedulePanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "idle_mission" && openIdlePanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "topic_mission" && openTopicPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "abort_cargo_mission" && openAbortCargoMission) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "blind_mission" && openBlindPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "peripheral_name_table" && openPeripheralNamePanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "peripheral_group_table" && openPeripheralGroupPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }

    if (formKey === "edit_tag" && openTagPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "edit_icon_style" && openChargeStylePanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "custom_cargo_info" && openCargoFormatPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "container_table" && openContainerTablePanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "warning_id" && openWarningPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "backup_file" && openBackupPanel) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "elevator_mission" && openElevatorMission) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    if (formKey === "clamp_height" && openClampHieght) {
      return <SortableWrap sortableId={formKey} key={formKey}></SortableWrap>;
    }
    return [];
  });
};
export default memo(ToolComponents);
