import { atom } from "jotai";

/**
 * 使用者目前在畫布上顯示/操作中的地圖 id。群組啟用後底下所有地圖都算使用中,
 * 這個 atom 純粹是前端「目前看的是哪一張」的選擇 —— 同時也是新增點位/路徑/區域時
 * 綁定 map_id 的依據。null 代表尚未選擇, 由後端 primary map 當預設值。
 */
export const currentMapIdAtom = atom<string | null>(null);
