import {
  colorKeys,
  cssVarName,
  DEFAULT_THEME_ID,
  getTheme,
  type Theme,
  type ThemeId,
} from "./palettes";

export const THEME_STORAGE_KEY = "fleet-ui-theme";

/**
 * 從 localStorage 讀出上次選的主題。
 * 私密瀏覽模式或被擋掉 storage 時 localStorage 會直接 throw,所以包起來,
 * 讀不到就退回預設主題,不要讓整個 app 起不來。
 */
export const readStoredThemeId = (): ThemeId => {
  try {
    return getTheme(localStorage.getItem(THEME_STORAGE_KEY)).id;
  } catch {
    return DEFAULT_THEME_ID;
  }
};

/**
 * 把一套主題的顏色寫成 CSS 變數掛到 <html> 上。
 * 同時寫一顆 data-theme-mode,讓少數需要「淺色 / 深色要走不同規則」的
 * CSS(例如捲軸、地圖底色)可以用屬性選擇器接。
 */
export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  colorKeys.forEach((key) => {
    root.style.setProperty(cssVarName(key), theme.colors[key]);
  });
  root.dataset.theme = theme.id;
  root.dataset.themeMode = theme.mode;
  // 讓瀏覽器原生元件(捲軸、下拉選單、表單控制項)也跟著切,
  // 否則深色主題下會冒出白色捲軸。
  root.style.colorScheme = theme.mode;
};

/**
 * 在 React 掛載之前先套一次,避免第一幀出現沒有變數的畫面
 * (var() 找不到值會退回瀏覽器預設,整片變透明或黑字白底閃一下)。
 */
export const initTheme = (): void => {
  applyTheme(getTheme(readStoredThemeId()));
};
