import { atom } from "jotai";

// 地圖上點了哪個點位,貨物面板就顯示它;null 代表面板關閉。
// 主畫面跟設定頁共用,兩邊都掛著同一個 <CargoPanel />
export type CargoPanelTarget = {
  type: "STORAGE" | "CONVEYOR" | "STACK" | "ELEVATOR";
  locationId: string;
  /** 只有貨架用得到 */
  level?: number;
};
export const CargoPanelTarget = atom<CargoPanelTarget | null>(null);
