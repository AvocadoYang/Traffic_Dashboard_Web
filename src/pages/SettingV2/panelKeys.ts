import type { ToolBarItemType } from "@/pages/Setting/components/siderElement";

// v2 才有、v1 沒有對應項目的面板 key。
// 刻意不加進 siderElement 的 formList,因為那份陣列同時是 v1 Setting 的
// 工具列資料來源,加進去 v1 會多出一個點不開的項目。
export type SettingV2OnlyKey = "appearance";

export type SettingV2PanelKey = ToolBarItemType | SettingV2OnlyKey;
