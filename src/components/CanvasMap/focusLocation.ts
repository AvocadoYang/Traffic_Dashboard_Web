import { atom } from "jotai";

/**
 * 「在地圖上定位」的請求: 首頁的畫布地圖看到之後會把那個點位移到畫面中央、放大,
 * 再用箭頭指幾秒。請求放在全域 atom, 所以從別的頁面 (貨物紀錄) 發出後再跳到首頁也接得到;
 * `at` 是為了避免請求發出後使用者去了別的地圖頁 (沒有畫布), 很久以後回首頁才突然跳過去。
 */
export type FocusLocationRequest = { locationId: string; at: number };

export const focusLocationRequest = atom<FocusLocationRequest | null>(null);

/** 請求超過這個時間沒被地圖接走就作廢 */
export const FOCUS_REQUEST_TTL_MS = 10_000;

/** 定位時至少放大到這個縮放 (本來就更大就不縮小) */
export const FOCUS_MIN_SCALE = 1.2;
/** 箭頭停留多久 */
export const FOCUS_MARKER_MS = 5_000;

/**
 * 舊資料沒有 location 欄位, 地點只在說明文字裡:
 *  "user create info at 40420: STACK"
 *  "#amr has load STACK: 40420" / "#amr has load 16002 level 2"
 *  "#amr offload to stack:410022" / "#amr offload to shelf:16002 level 2"
 * 抓不到就回傳 null
 */
export const locationFromDescription = (description: string | null | undefined) => {
  if (!description) return null;
  const create = /\bat\s+(\S+:\s*[A-Za-z_]+)\s*$/.exec(description);
  if (create) return create[1];
  const loadPeripheral = /\bhas load\s+([A-Za-z_]+:\s*\S+)/.exec(description);
  if (loadPeripheral) return loadPeripheral[1];
  const loadShelf = /\bhas load\s+(\S+)\s+level\s+(\d+)/.exec(description);
  if (loadShelf) return `${loadShelf[1]} L${loadShelf[2]}`;
  const offload = /\boffload to\s+([A-Za-z_]+:\s*\S+)(?:\s+level\s+(\d+))?/.exec(description);
  if (offload) return offload[2] ? `${offload[1]} L${offload[2]}` : offload[1];
  return null;
};

/**
 * 從貨物歷史的地點文字取出點位 id:
 * "16002 L2" (貨架第 2 層) -> "16002"; "conveyor:C03" -> "C03"; "ELEVATOR:5" -> "5";
 * "40420: STACK" -> "40420"
 */
export const parseLocationId = (text: string | null | undefined): string | null => {
  if (!text) return null;
  const t = text.trim();
  // "40420: STACK" (手動建立貨物時記的 "點位: 類型")
  const idFirst = /^(\S+?):\s*[A-Za-z_]+$/.exec(t);
  if (idFirst) return idFirst[1];
  const id = t
    .replace(/^[A-Za-z_]+:\s*/, "")
    .replace(/\s+L\d+$/i, "")
    .trim();
  return id || null;
};
