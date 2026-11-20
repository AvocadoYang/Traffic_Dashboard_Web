// MiR 風格打點新增的獨立地點類型,用實際的 PNG 圖示(放在 dashboard
// public/ 底下,檔名就是 areaType 字串)取代其他類型用的純色圓點。
// 新增類型時:這裡加一筆、public/ 放同名 PNG,再到 MirStyleLocationPlacer 的
// TYPE_OPTIONS 與 setting/utils/func.ts 補上。PNG 有兩個約定要先確認,不然
// 尺寸或角度會跟其他標記對不起來:
//   1. 裁掉透明留白、圖案本體填滿整張正方形畫布(留白會讓圖看起來偏小)。
//   2. 朝向要畫成「rotation=0 時指向右邊」——三角形/箭頭指右。素材若是
//      指下或指上,轉出來就會固定差 90 度,要先把圖轉正而不是在程式裡補償。
export const MIR_AREA_TYPES = new Set([
  "MIR_ROBOT_POSITION",
  "MIR_SHELF_POSITION",
  "MIR_CHARGING_STATION",
  "MIR_VL_MARKER",
  "MIR_STRIPE_MARKER",
]);

export const isMirAreaType = (areaType: string) => MIR_AREA_TYPES.has(areaType);

export const MIR_DETECTABLE_AREA_TYPES = new Set([
  "MIR_CHARGING_STATION",
  "MIR_VL_MARKER",
  "MIR_STRIPE_MARKER",
]);

export const isDetectableAreaType = (areaType: string) =>
  MIR_DETECTABLE_AREA_TYPES.has(areaType);

const DEFAULT_MARKER_PATTERN: Record<string, number> = {
  MIR_STRIPE_MARKER: 31,
  MIR_CHARGING_STATION: 20,
  MIR_VL_MARKER: 11,
};

export const FALLBACK_MARKER_PATTERN = 20;

export const getDefaultMarkerPattern = (areaType?: string) =>
  DEFAULT_MARKER_PATTERN[areaType ?? ""] ?? FALLBACK_MARKER_PATTERN;

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
