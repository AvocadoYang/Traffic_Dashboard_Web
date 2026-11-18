import { atom } from "jotai";

/**
 * 登入成功後的「點火」轉場: 有值就播一次 (Ignition.tsx)。
 * 只存在記憶體裡, 重新整理、直接開網址都不會播, 只有從登入頁登入才會。
 */
export type IgnitionRequest = { name: string };
export const ignitionAtom = atom<IgnitionRequest | null>(null);

/** 系統設定「減少動態效果」時不播轉場, 直接進系統 */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
