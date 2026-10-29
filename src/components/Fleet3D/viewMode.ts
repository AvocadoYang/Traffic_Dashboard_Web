import { atomWithStorage } from "jotai/utils";

/** 首頁地圖顯示 2D 還是 3D (存 localStorage, 預設 2D) */
export type MapViewMode = "2d" | "3d";
export const mapViewModeAtom = atomWithStorage<MapViewMode>("fleet-map-view", "2d");

/** 3D 檢視的巡視模式 (告警時鏡頭自動飛過去, 見 patrol.ts); 存 localStorage, 中控室大螢幕重開還是開著 */
export const patrolAtom = atomWithStorage<boolean>("fleet-3d-patrol", false);

/** 3D 車上一直顯示標籤 (車號、狀態、要去哪、告警); 關掉時 (預設) 游標移到車上才顯示 */
export const vehicleLabelsAtom = atomWithStorage<boolean>("fleet-3d-vehicle-labels", false);
