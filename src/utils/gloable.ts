import { atom } from "jotai";
import { LocationType } from "./jotai";
import { mouseLocation } from "@/pages/Setting/hooks/hook";
import { SelectStation } from "@/api/type/useLocation";
import { SelectProps } from "antd";

// record the version of map's points
export const sameVersion = atom(true);

// control which ID of draggableLine can be use.
export const showBlockId = atom<string>("");

// record the drag line information
export const DragLineInfo = atom<mouseLocation>({});

export const hoverRoad = atom<string>("");

// ** 貨架樣式 */
export const cargoStyle = atom<{
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
} | null>(null);

export const shelfSelectedStyleLocationId = atom<string>("");

export const darkMode = atom<boolean>(false);

export const Scale = atom<number>(1);

export const mousePoint_X = atom<number>(-5); // MousePoint 編輯點位小紅點
export const mousePoint_Y = atom<number>(-5); // MousePoint 編輯點位小紅點

export const locationXForQuickEditLocationPanel = atom<number>(0);
export const locationYForQuickEditLocationPanel = atom<number>(0);

export const TempStoredLocationsForQuickEditPanel = atom<LocationType[]>([]);

export const tooltipProp = atom<{
  x: number;
  y: number;
  locationId: string;
} | null>(null);

export const chargeStationModelProp = atom<{
  open: boolean;
  location: string;
} | null>(null);

//to delete
export const isEditChargeStation = atom(false);
export const chargeStationEditData = atom<null | SelectStation>(null);

export const IsEditPeripheralStyle = atom(false);
export const PeripheralEditData = atom<null | SelectStation>(null);

export const hintAmr = atom("");
export const AmrFilterCarCard = atom<Set<string>>(new Set([]));
export const showZoneForbidden = atom<Set<string>>(new Set([]));
// export const AmrFilterCarCard = atom('');
export const AmrCarSelectFilter = atom<SelectProps["options"]>([]);

export const QuickMissionSelectParam = atom<string>("");
