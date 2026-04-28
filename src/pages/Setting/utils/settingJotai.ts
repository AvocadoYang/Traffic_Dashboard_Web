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

// Edit Stack Modal
export const ESM = atom<{ locationId: string | null; isOpen: boolean }>({
  locationId: null,
  isOpen: false,
});
//Edit stack carog
export const ESC = atom<boolean>(false);

//Edit blind location mission modal
export const EBLM = atom<{ locationId: string | null; isOpen: boolean }>({
  locationId: null,
  isOpen: false,
});
