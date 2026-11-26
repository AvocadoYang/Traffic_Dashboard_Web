import { atom } from "jotai";

/** 首頁的「Advantech 4000」面板; 跟模擬車輛面板在同一側, 開一個就關另一個 */
export const OpenAdvantechPanel = atom<boolean>(false);
