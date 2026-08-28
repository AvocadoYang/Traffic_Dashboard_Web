import { atom } from "jotai";
import { LocationType } from "./jotai";
import { mouseLocation, RectInfo } from "@/pages/Setting/hooks/hook";
import { SelectStation } from "@/api/type/useLocation";
import { SelectProps } from "antd";

// record the version of map's points
export const sameVersion = atom(true);

// control which ID of draggableLine can be use.
export const showBlockId = atom<string>("");

// record the drag line information
export const DragLineInfo = atom<mouseLocation>({});

export const hoverRoad = atom<string>("");

export const initialZoneRectInfo: RectInfo = {
  axisX: -5000,
  axisY: -5000,
  width: 0,
  height: 0,
};
export const zoneRectInfo = atom<RectInfo>(initialZoneRectInfo);

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

export const centerMap = atom<number>(0);

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

export const mouseDetectLoc = atom<Set<string>>(new Set([]));

// 「地點提示」游標移動時，附近點位的懸浮標籤資訊。
// x/y 為地圖未縮放的本地座標(與 Point 的 left/top 同一座標系)，
// locationIds 為目前落在偵測半徑內、依 locationId 排序後的點位清單。
export const locationHoverInfo = atom<{
  x: number;
  y: number;
  locationIds: string[];
} | null>(null);

// 「路徑提示」游標移動時，附近路徑的懸浮標籤資訊，座標系與 locationHoverInfo 相同。
export const roadHoverInfo = atom<{
  x: number;
  y: number;
  roadIds: string[];
} | null>(null);

// 定位校正工具：非 null 時代表正在對指定 amrId 校正定位。
// dx/dy 為相對於車輛目前 pose 的位移（ROS 座標系, 公尺），dYaw 為相對旋轉角度（度）。
export const localizationCorrection = atom<{
  amrId: string;
  dx: number;
  dy: number;
  dYaw: number;
} | null>(null);
