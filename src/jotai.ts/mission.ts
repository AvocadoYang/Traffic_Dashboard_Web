import { atom } from "jotai";

// ㄊ快速任務的取貨點與卸貨點資料結構 
export type Quick_Mission = {
  missionType: "load" | "offload"; // 動作類型：取貨 or 卸貨
  columnName: string;              // 貨架欄位名稱
  locationId: string;              // 位置 ID
  level: number;                   // 貨架層號
};

// 使用者在地圖上選定的取貨點，未選取時為 null 
export const QuickMissionLoad = atom<Quick_Mission | null>(null);

//  使用者在地圖上選定的卸貨點，未選取時為 null 
export const QuickMissionOffload = atom<Quick_Mission | null>(null);

// 是否正在地圖選點模式中（true 時地圖格位會進入可點擊狀態） 
export const StartQuickMissionSetting = atom<boolean>(false);

// 目前選點的動作類型，不在選點模式時為 null 
export const QuickMissionSettingMode = atom<"load" | "offload" | null>(null);