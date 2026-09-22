import { atom } from "jotai";

export enum ViewBtn {
  mapView,
  missionView,
  infoView,
  alertView,
}

export const viewBtn = atom<ViewBtn>(ViewBtn.missionView);

export const Open2DMap = atom<boolean>(false);

export const Open3DMap = atom<boolean>(false);

export const OpenQuickMission = atom<boolean>(false);

export const OpenAssignMission = atom<boolean>(false);

export const OpenAutoMission = atom<boolean>(false);

export const OpenInputMission = atom<boolean>(false);

export const OpenCarCardInfo = atom<boolean>(false);

export const OpenMissionCardInfo = atom<boolean>(false);

export type Quick_Mission = {
  missionType: "load" | "offload";
  columnName: string;
  locationId: string;
  level: number;
};

export const QuickMissionLoad = atom<Quick_Mission | null>(null);
export const QuickMissionOffload = atom<Quick_Mission | null>(null);
export const StartQuickMissionSetting = atom<boolean>(false);
export const QuickMissionSettingMode = atom<"load" | "offload" | null>(null);
// 多層貨架在選取儲位時，目前展開「層數選擇器」的貨架 locationId
export const QuickMissionPickerLoc = atom<string | null>(null);
// 層數選擇器裡滑鼠停留的那一層，地圖上對應的格子會跟著高亮
export const QuickMissionHoverCell = atom<{
  locationId: string;
  level: number;
} | null>(null);

export const OpenChargeStationModal = atom<string | null>(null);

export const OpenDirect = atom<{ open: boolean; locationId: string | null }>({
  open: false,
  locationId: null,
});

export const OpenQueueMirTask = atom<boolean>(false);

export const JoystickAmrId = atom<string | null>(null);