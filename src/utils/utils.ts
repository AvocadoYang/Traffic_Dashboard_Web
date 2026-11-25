import { MessageInstance } from "antd/es/message/interface";
import { ErrorResponse } from "./globalType";
import { md5 } from "@/utils/md5";
import convert from "color-convert";
import i18next from "i18next";

export const rosCoord2DisplayCoord = ({
  x,
  y,
  mapResolution,
  mapOriginX,
  mapOriginY,
  mapHeight,
}: {
  x: number;
  y: number;
  mapResolution: number;
  mapOriginX: number;
  mapOriginY: number;
  mapHeight: number;
}) => [
  (x - mapOriginX) / mapResolution,
  mapHeight - (y - mapOriginY) / mapResolution,
];

export const rvizCoord = ({
  displayX,
  displayY,
  mapResolution,
  mapOriginX,
  mapOriginY,
  mapHeight,
  scaleSize,
}: {
  displayX: number;
  displayY: number;
  mapResolution: number;
  mapOriginX: number;
  mapOriginY: number;
  mapHeight: number;
  scaleSize: number;
}) => [
  (displayX / scaleSize) * mapResolution + mapOriginX,
  (mapHeight - displayY / scaleSize) * mapResolution + mapOriginY,
];

export const rvizCoord2 = ({
  displayX,
  displayY,
  mapResolution,
  mapOriginX,
  mapOriginY,
  mapHeight,
  scaleSize,
}: {
  displayX: number;
  displayY: number;
  mapResolution: number;
  mapOriginX: number;
  mapOriginY: number;
  mapHeight: number;
  scaleSize: number;
}) => [
  displayX * scaleSize * mapResolution + mapOriginX,
  (mapHeight - displayY * scaleSize) * mapResolution + mapOriginY,
];

// 求點(px,py)到線段((x1,y1)-(x2,y2))上最近的點，回傳該點座標與距離。
// 座標系不拘(ROS 座標或畫面像素皆可)，呼叫端需自行保證單位一致。
export const closestPointOnSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return { x, y, distance: Math.hypot(px - x, py - y) };
};

export const sanitizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

export const sanitizeSignedDeg = (deg: number) => {
  const wrapped = sanitizeDeg(deg);
  return wrapped > 180 ? wrapped - 360 : wrapped;
};

export const rad2Deg = (rad: number) => sanitizeDeg((rad / Math.PI) * 180);

export const deg2Rad = (deg: number) => (sanitizeDeg(deg) / 180) * Math.PI;

export const errorHandler = (e: ErrorResponse, messageApi: MessageInstance) => {
  console.log(e.response?.data);

  const errorMessage =
    e?.response?.data?.message ||
    e?.response?.data?.error?.message ||
    // 這裡不在元件裡,拿不到 useTranslation 的 t;全域 i18next.t 的 key 型別
    // 又跟 hook 的不一樣,所以收斂成 string
    (i18next.t as (key: string) => string)("utils.unknown_error");

  void messageApi.error(errorMessage, 5);
};

/**
 * 編輯 (整筆寫回去的那種) 失敗時用這個.
 *
 * 後端回 409 表示這筆資料在打開編輯之後被別人改過或刪掉了:表單上是舊資料,
 * 再按一次儲存也不會過,要重讀。onConflict 負責重讀資料、關掉編輯視窗。
 * 其他錯誤照 errorHandler 顯示。
 */
export const editErrorHandler = (
  e: ErrorResponse,
  messageApi: MessageInstance,
  onConflict: () => void,
) => {
  if (e?.response?.status !== 409) {
    errorHandler(e, messageApi);
    return;
  }
  void messageApi.warning(
    (i18next.t as (key: string) => string)("utils.edit_conflict"),
    6,
  );
  onConflict();
};

export const amrId2Color = (amrId: string) => {
  const seed = parseInt(`0x${md5(amrId)}`, 16);
  const h = (seed % 60) + 200;
  const s = (seed % 20) + 40;
  const l = (seed % 20) + 30;
  const color = `#${convert.hsl.hex([h, s, l])}`;
  return color;
};

/*
 * 車輛識別色: 卡片上的車號牌、地圖上的車與路線、任務表的車號徽章都用同一個顏色。
 *
 * 以前是拿車號的雜湊值決定色相 / 飽和度 / 明度, 結果明度亂跳 (有淡黃、粉紅, 白底上看不見)、
 * 色相會擠在一起, 綠 / 紅還會跟「在線」「異常」的狀態色搞混。
 * 現在是固定色盤: 每個顏色在白底上都看得清楚 (對比度 >= 3.4:1), 色相避開狀態色 (紅 / 綠 / 琥珀),
 * 只有藍、紫、青、洋紅、棕這幾類。
 *
 * 分配方式: 車隊名單 (all-amr-name) 載入後依車號排序, 第 N 台拿第 N 個顏色, 所以只要車數不超過色盤,
 * 保證不會撞色; 每台電腦排序一樣, 顏色也一樣。名單還沒載入 (或不在名單裡) 時退回雜湊, 至少顏色穩定。
 * 車數增減時排序會變動, 部分車的顏色會跟著換。
 */
export const AMR_COLORS = [
  "#2F6FDE", // 藍
  "#7A3FD1", // 紫
  "#0E9AA7", // 青
  "#B8399F", // 洋紅
  "#8A5A2B", // 棕
  "#24459E", // 深藍
  "#0F7FB8", // 天藍
  "#8E2C6B", // 梅紅
  "#4C4FD6", // 靛
  "#0B6B73", // 深青
  "#C0387F", // 玫紅
  "#2D8CF0", // 亮藍
  "#A24BD0", // 蘭紫
  "#5E2B8F", // 深紫
  "#19B5C8", // 水藍
  "#6B7C93", // 灰藍
] as const;

let amrColorOrder: string[] = [];
/** 設定頁手動指定的顏色 (後端 register_robot.display_color), 優先於自動分配 */
let amrColorOverrides = new Map<string, string>();
let amrColorVersion = 0;
/** 名單更新時加一; 有自己快取顏色的地方 (CanvasMap) 靠它判斷快取是否過期 */
export const getAmrColorVersion = () => amrColorVersion;

/** 車號最後一段 (anfa-ps14-16-068 → 068), 卡片、地圖上的車號牌共用 */
export const amrShortNum = (amrId: string) => amrId.split("-").slice(-1)[0];

/**
 * 車隊名單載入 / 更新時呼叫, 之後 amrId2ColorRainbow 依名單排序分配顏色。
 * overrides: 設定頁手動指定的顏色 (車號 → #RRGGBB), 有指定的車直接用, 不佔用自動分配的順位。
 */
export const setAmrColorOrder = (amrIds: string[], overrides: Record<string, string> = {}) => {
  amrColorOverrides = new Map(Object.entries(overrides).filter(([, c]) => /^#[0-9a-f]{6}$/i.test(c)));
  // 自動分配只排「沒指定顏色」的車, 這樣指定了某台之後, 其他車的顏色不會跟著位移
  amrColorOrder = [...new Set(amrIds)].filter((id) => !amrColorOverrides.has(id)).sort();
  amrColorVersion += 1;
};

export const amrId2ColorRainbow = (amrId: string) => {
  const manual = amrColorOverrides.get(amrId);
  if (manual) return manual;
  const idx = amrColorOrder.indexOf(amrId);
  if (idx >= 0) return AMR_COLORS[idx % AMR_COLORS.length];
  const seed = parseInt(`0x${md5(amrId)}`, 16);
  return AMR_COLORS[seed % AMR_COLORS.length];
};

/** 色塊上的字用黑還是白: 取對比度比較高的 */
export const textOnColor = (hex: string) => {
  const lum = (h: string) => {
    const n = parseInt(h.slice(1, 7), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l = lum(hex);
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.0556) ? "#ffffff" : "#111111";
};
