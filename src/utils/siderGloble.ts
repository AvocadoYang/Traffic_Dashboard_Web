import { atom } from "jotai";

/** 1-1 編輯點位開關 */
export const EditLocationPanelSwitch = atom<boolean>(false);

/** 1-2 快速編輯點位開關 */
export const QuickEditLocationPanelSwitch = atom<boolean>(false);

/** 1-3 顯示所有點位表單 */
export const EditLocationListTableSwitch = atom<boolean>(false);

/** 2-1 編輯路徑開關 */
export const EditRoadPanelSwitch = atom<boolean>(false);

/** 2-2 顯示所有路徑表單 */
export const RoadListTableSwitch = atom<boolean>(false);

/** 2-3 顯示快速拉路線表單 */
export const QuickEditRoadSwitch = atom<boolean>(false);

/** 3-1 編輯區域開關 */
export const EditZoneSwitch = atom<boolean>(false);

/** 3-2 顯示區域開關 */
export const showAllZonesSwitch = atom<boolean>(true);

/** 3-3 顯示區域表開關 */
export const showZonesTableSwitch = atom<boolean>(false);

/** 4-1 顯示 編輯貨架 */
export const EditShelfPanelSwitch = atom<boolean>(false);

/** 4-2 顯示 編輯貨架種類 */
export const EditShelfCategoryPanelSwitch = atom<boolean>(false);

/** 4-3 顯示 編輯YAW */
export const EditShelfYawPanelSwitch = atom<boolean>(false);

/** 5-1 顯示編輯註冊車輛 */
export const isShowRegisterAMR = atom<boolean>(false);

/** 5-2 顯示編輯車輛細節參數 */
export const isShowAMRConfig = atom<boolean>(false);

/** 6-1 顯示編輯任務 */
export const isShowEditMission = atom<boolean>(false);

/** 6-2 顯示編輯充電任務 */
export const isShowEditChargeMission = atom<boolean>(false);

/** 6-4 顯示編輯離開充電站強制任務 */
export const isShowEditBeforeLeftChargeStationMission = atom<boolean>(false);

/** 6-5 顯示定時任務 */
export const isShowEditScheduleMission = atom<boolean>(false);

/** 6-6 顯示閒置任務 */
export const isShowEditIdleMission = atom<boolean>(false);

/** 6-7 顯示topic任務 */
export const isShowEditTopicMission = atom<boolean>(false);

/** 6-8 顯示刪除任務身上有貨處理機制任務 */
export const isShowEditAbortMissionWhenHasCargoMission = atom<boolean>(false);

/** 7-1 顯示設備名稱表 */
export const isShowPeripheralNameTable = atom<boolean>(false);

/** 7-2 顯示設備群組表 */
export const isShowPeripheralGroupTable = atom<boolean>(false);

/** 8-1 顯示編輯標籤 */
export const isShowEditMissionTag = atom<boolean>(false);

/** 8-2 顯示編輯充電站icon位置 */
export const isShowEditChargeStationPosition = atom<boolean>(false);

/** 8-3 顯示自定義貨物格式 */
export const isShowEditCustomCargoFormat = atom<boolean>(false);

/** 9-1 顯示編輯warning id */
export const isShowEditWarningId = atom<boolean>(false);

/** 9-2 上傳錯誤表 */
export const isOpenUploadWarningIDModal = atom<boolean>(false);

/** 9-4 開啟交換地圖 */
export const isOpenSwitchMap = atom<boolean>(false);

/** 9-2 顯示編輯備份 */
export const isShowEditBackup = atom<boolean>(false);

// /** 9-3 顯示起始位置設定 */
// export const isShowStartPoint = atom<boolean>(false);

/** 地點tooltip */
export const isShowLocationTooltip = atom<boolean>(false);

export const mousePosition = atom<{ clientX: number; clientY: number }>({
  clientX: 0,
  clientY: 0,
});

export const mouseMoveSwitch = atom<boolean>(true);

/** 路線tooltip */
export const isShowRoadTooltip = atom<boolean>(false);

/** 顯示目前地點 */
export const isShowLocation = atom<boolean>(true);

/** 顯示目前路徑 */
export const isShowRoad = atom<boolean>(true);

/** 10-1 顯示編輯備份 */
export const isShowYfyAutoMission = atom<boolean>(false);
