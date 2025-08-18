import { atom } from "jotai";

// 快速編輯路徑用
export const IsEditingQuickRoads = atom<boolean>(false);
export const QuickRoadsArray = atom<string[]>([]);
