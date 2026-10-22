import { isMirAreaType } from "./components/MirAreaTypeMarker";

// 哪些地點屬性在地圖上畫成「點位」(一顆小圓點,可以拉路線、首頁可以點它直接派車)。
//
// 其他屬性(充電站、儲位、輸送帶…)各自有自己的圖層。不在這份名單、又沒有專屬圖層的屬性,
// 在地圖上會完全看不到,也就沒辦法接路線——後端新增「用法跟路徑點一樣」的屬性時要記得加進來。
// 首頁、設定頁、模擬頁的點位圖層和游標附近的點位提示都看這一份,不要各自再寫一次。
//
// DISPATCH 有兩種寫法是歷史因素:後端是全大寫,設定頁以前比對的是 "Dispatch"。
const PLAIN_POINT_AREA_TYPES = new Set([
  "EXTRA",
  "STANDBY",
  "DISPATCH",
  "Dispatch",
]);

export const isPointAreaType = (areaType: string) =>
  PLAIN_POINT_AREA_TYPES.has(areaType) || isMirAreaType(areaType);

/** 待命區:閒置的車會被派去停的點位。畫法跟路徑點一樣,只是外面多一圈 */
export const isStandbyAreaType = (areaType: string) => areaType === "STANDBY";
