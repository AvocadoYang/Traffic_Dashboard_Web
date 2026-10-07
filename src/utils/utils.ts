import { MessageInstance } from "antd/es/message/interface";
import { ErrorResponse } from "./globalType";
import { MD5 } from "crypto-js";
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
    e?.response?.data?.error.message ||
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
  const seed = parseInt(`0x${MD5(amrId).toString()}`, 16);
  const h = (seed % 60) + 200;
  const s = (seed % 20) + 40;
  const l = (seed % 20) + 30;
  const color = `#${convert.hsl.hex([h, s, l])}`;
  return color;
};

export const amrId2ColorRainbow = (amrId: string) => {
  const seed = parseInt(`0x${MD5(amrId).toString()}`, 16);
  const h = seed % 360;
  const s = (seed % 70) + 80;
  const l = (seed % 60) + 10;
  const color = `#${convert.hsl.hex([h, s, l])}`;
  return color;
};
