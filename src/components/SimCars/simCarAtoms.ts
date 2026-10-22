import { atom } from "jotai";

/** 首頁的「模擬車輛」面板 */
export const OpenSimCarPanel = atom<boolean>(false);

/** 正在編輯參數的模擬車 id (面板列表或地圖上的車點開) */
export const EditingSimCar = atom<string | null>(null);
