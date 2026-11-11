import { atom } from "jotai";

/**
 * 車輛卡片上 hover「起點 → 終點」時, 地圖要標出來的點位。
 * label 由卡片翻譯好 (例如「起點 101」), 畫布只負責畫。
 * kind: start 起點 / end 終點 / next 這一動要去的點 (跟終點不同時)
 */
export type RouteHighlightPoint = {
  locationId: string;
  label: string;
  kind: "start" | "end" | "next";
};

export type RouteHighlight = {
  amrId: string;
  points: RouteHighlightPoint[];
  /** 開始 hover 的時間 (performance.now()), 畫淡入用 */
  since: number;
};

export const routeHighlightAtom = atom<RouteHighlight | null>(null);
