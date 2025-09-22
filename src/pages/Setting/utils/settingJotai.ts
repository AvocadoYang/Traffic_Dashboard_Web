import { atom } from "jotai";

// 快速編輯路徑用
export const IsEditingQuickRoads = atom<boolean>(false);
export const QuickRoadsArray = atom<string[]>([]);

// EditElevatorModal
export const EEM = atom<{ locationId: string | null; isOpen: boolean }>({
  locationId: null,
  isOpen: false,
});
//Edit elevator carog
export const EEC = atom<boolean>(false);

// EditChargeStationModal
export const ECSM = atom<{ locationId: string | null; isOpen: boolean }>({
  locationId: null,
  isOpen: false,
});
