/** 看板的輪播頁; key 同時是網址 ?slides= 用的名字 */
export const SLIDE_KEYS = ["map", "report", "fleet", "alarms"] as const;
export type SlideKey = (typeof SLIDE_KEYS)[number];

export const DEFAULT_INTERVAL_S = 15;
export const MIN_INTERVAL_S = 5;
export const MAX_INTERVAL_S = 300;

/** ?slides=map,fleet 只輪播這幾頁 (照網址的順序); 沒帶或都不認得就全部 */
export const parseSlides = (raw: string | null): SlideKey[] => {
  const picked = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SlideKey => (SLIDE_KEYS as readonly string[]).includes(s));
  const uniq = [...new Set(picked)];
  return uniq.length ? uniq : [...SLIDE_KEYS];
};

/** ?interval=30 每頁停幾秒; 不合理的值用預設, 太小 / 太大夾在範圍內 */
export const parseInterval = (raw: string | null): number => {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_S;
  return Math.min(MAX_INTERVAL_S, Math.max(MIN_INTERVAL_S, Math.round(n)));
};

/** 下一頁 / 上一頁 (繞一圈) */
export const stepIndex = (index: number, count: number, delta: 1 | -1): number =>
  count <= 0 ? 0 : (((index + delta) % count) + count) % count;

/** 電量條的顏色等級 */
export const batteryLevel = (pct: number | undefined): "ok" | "warn" | "low" | "unknown" =>
  pct === undefined || !Number.isFinite(pct) ? "unknown" : pct < 20 ? "low" : pct < 40 ? "warn" : "ok";

/** 跟 Scene3D 的鏡頭一致: 視野 45 度、仰角 55 度 */
const FOV_DEG = 45;
const ELEVATION = (55 * Math.PI) / 180;

/**
 * 看板的 3D 視角: 把點位 / 路線實際有東西的範圍 (不是整張底圖, 底圖常常大很多) 放滿畫面。
 * 格式同 setView (MapView3dPref 去掉 mapId): 看的地面位置 (ROS 座標) + 鏡頭相對那裡的位移。
 * 沒有點位就回 null (讓畫面用整張地圖)。
 */
export const contentView = (
  points: { x: number; y: number }[],
  aspect: number,
  margin = 3,
): { tx: number; ty: number; dx: number; dy: number; dz: number } | null => {
  if (!points.length) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const w = Math.max(maxX - minX, 1) + margin * 2;
  const h = Math.max(maxY - minY, 1) + margin * 2;
  const span = Math.max(h, w / Math.max(aspect, 0.1));
  // 斜著看時近的那邊比較寬, 多留 25%
  const distance = (span / (2 * Math.tan((FOV_DEG / 2) * (Math.PI / 180)))) * 1.25;
  return { tx: (minX + maxX) / 2, ty: (minY + maxY) / 2, dx: 0, dy: distance * Math.sin(ELEVATION), dz: distance * Math.cos(ELEVATION) };
};
