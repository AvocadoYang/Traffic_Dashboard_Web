import { atom } from "jotai";
import type { SettingV2PanelKey } from "./panelKeys";

// 設定頁 v2 只有「目前選中的那一個面板」這一份狀態,取代 v1 那 40 幾顆各自獨立的
// 開關 atom。key space 直接沿用 v1 的 ToolBarItemType,所以每個既有面板元件都能
// 原封不動重用。
export const activeSettingPanelAtom = atom<SettingV2PanelKey | null>(null);
