import { atom } from "jotai";

// ============================================================
// 導航狀態
// ============================================================

/** 行動版側邊欄的頁籤選項 */
export enum ViewBtn {
  mapView,      // 0 — 地圖視圖
  missionView,  // 1 — 任務視圖（預設）
  infoView,     // 2 — 資訊視圖
  alertView,    // 3 — 警告視圖
}

/** 行動版側邊欄目前選中的頁籤，預設為任務視圖 */
export const viewBtn = atom<ViewBtn>(ViewBtn.missionView);

// ============================================================
// 地圖面板開關
// ============================================================

/** 行動版 2D 地圖面板是否開啟 */
export const Open2DMap = atom<boolean>(false);

/** 行動版 3D 地圖面板是否開啟（目前功能開發中） */
export const Open3DMap = atom<boolean>(false);

// ============================================================
// 任務 Modal 開關
// ============================================================

/** 快速任務 Modal 是否開啟（行動版使用） */
export const OpenQuickMission = atom<boolean>(false);

/** 流程任務 Modal 是否開啟 */
export const OpenAssignMission = atom<boolean>(false);

/** 循環任務 Modal 是否開啟 */
export const OpenAutoMission = atom<boolean>(false);

/** 輸入任務 Modal 是否開啟（功能待實作） */
export const OpenInputMission = atom<boolean>(false);

// ============================================================
// 行動版資訊面板開關
// ============================================================

/** 行動版 AMR 卡片列表是否開啟 */
export const OpenCarCardInfo = atom<boolean>(false);

/** 行動版任務列表是否開啟 */
export const OpenMissionCardInfo = atom<boolean>(false);

// ============================================================
// 充電站 Modal
// ============================================================

/** 目前開啟的充電站 Modal 對應的 locationId，未開啟時為 null */
export const OpenChargeStationModal = atom<string | null>(null);

// ============================================================
// 方向控制 Modal
// ============================================================

/** 方向控制 Modal 的開關狀態與對應的位置 ID */
export const OpenDirect = atom<{ open: boolean; locationId: string | null }>({
  open: false,
  locationId: null,
});

