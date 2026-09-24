import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { applyTheme, readStoredThemeId, THEME_STORAGE_KEY } from "./applyTheme";
import {
  DEFAULT_THEME_ID,
  getTheme,
  type Theme,
  type ThemeId,
} from "./palettes";

/**
 * 直接存字串,不走 atomWithStorage 預設的 JSON 編碼。
 * 這樣 localStorage 裡是 `fleet-ui-theme: midnight` 而不是 `"midnight"`,
 * initTheme() 在 React 起來之前用原生 getItem 讀的也是同一個值,兩邊不會對不上。
 * 讀不到 / 存不進去(私密瀏覽、storage 被擋)一律當作預設主題,不要 throw。
 *
 * jotai 沒有把 SyncStorage 這個型別 export 出來,所以這裡自己寫出形狀。
 */
const themeStorage = {
  getItem: (key: string, initialValue: ThemeId): ThemeId => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? getTheme(stored).id : initialValue;
    } catch {
      return initialValue;
    }
  },
  setItem: (key: string, value: ThemeId): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 存不進去就算了,當次 session 仍然可以正常切換 */
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 同上 */
    }
  },
};

/**
 * 目前選用的主題 id。初始值就讀 storage(getOnInit),跟 main.tsx 裡
 * initTheme() 套上去的那一套一致,不會出現「畫面已經深色、atom 還說是灰階」。
 */
export const themeIdAtom = atomWithStorage<ThemeId>(
  THEME_STORAGE_KEY,
  readStoredThemeId(),
  themeStorage,
  { getOnInit: true },
);

/**
 * 讀用的 id。atomWithStorage 的型別包含 Promise(它也支援非同步 storage),
 * 但我們用的是同步的 localStorage,所以這裡收斂成純字串,讓使用端不用處理
 * 一個實際上不會發生的分支。
 */
export const currentThemeIdAtom = atom<ThemeId>((get) => {
  const id = get(themeIdAtom);
  return typeof id === "string" ? id : DEFAULT_THEME_ID;
});

/** 唯讀的衍生 atom:要拿真實顏色值(例如餵給 antd)的地方取這顆。 */
export const themeAtom = atom<Theme>((get) => getTheme(get(currentThemeIdAtom)));

/** 切主題:寫進 storage 的同時立刻把 <html> 上的 CSS 變數換掉。 */
export const setThemeAtom = atom(null, (_get, set, id: ThemeId) => {
  set(themeIdAtom, id);
  applyTheme(getTheme(id));
});
