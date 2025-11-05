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

export const OpenChargeStationModal = atom<string | null>(null);

export const OpenDirect = atom<{ open: boolean; locationId: string | null }>({
  open: false,
  locationId: null,
});
