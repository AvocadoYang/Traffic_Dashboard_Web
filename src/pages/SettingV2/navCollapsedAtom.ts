import { atom } from "jotai";

const STORAGE_KEY = "settingV2NavCollapsed";

const read = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // 無痕模式 / 停用 storage 時直接用預設值(展開)
    return false;
  }
};

const baseAtom = atom<boolean>(read());

/**
 * 左側操作選單有沒有收起來。跟 mapViewModeAtom 一樣記在 localStorage,
 * 這是一個人的操作習慣,不該每次進頁面又要重收一次。
 *
 * 只作用在寬螢幕;窄螢幕的選單本來就是抽屜,沒有「收起」這個狀態。
 */
export const navCollapsedAtom = atom(
  (get) => get(baseAtom),
  (_get, set, next: boolean) => {
    set(baseAtom, next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // 存不起來就算了,不影響操作
    }
  },
);
