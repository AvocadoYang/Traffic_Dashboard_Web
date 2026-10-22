import {
  colorKeys,
  cssVarName,
  DEFAULT_MAP_IMAGE_MODE,
  DEFAULT_THEME_ID,
  getMapCanvas,
  getTheme,
  resolveColors,
  type MapImageMode,
  type Theme,
  type ThemeId,
} from "./palettes";
import { isDarkColor } from "./mapImage";

export const THEME_STORAGE_KEY = "fleet-ui-theme";
export const MAP_IMAGE_STORAGE_KEY = "fleet-map-image";

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

/** 從 localStorage 讀出底圖的顯示方式,讀不到就用預設(跟著主題)。 */
export const readStoredMapImageMode = (): MapImageMode => {
  try {
    const stored = localStorage.getItem(MAP_IMAGE_STORAGE_KEY);
    return stored === "themed" || stored === "original"
      ? stored
      : DEFAULT_MAP_IMAGE_MODE;
  } catch {
    return DEFAULT_MAP_IMAGE_MODE;
  }
};

/**
 * 把一套主題的顏色寫成 CSS 變數掛到 <html> 上。
 * 同時寫一顆 data-theme-mode,讓少數需要「淺色 / 深色要走不同規則」的
 * CSS(例如捲軸、地圖底色)可以用屬性選擇器接。
 *
 * mapImage 是底圖的顯示方式。地圖上的顏色要看底圖現在是深是淺來決定,
 * 所以這裡要一起給,不能只看主題。
 */
export const applyTheme = (theme: Theme, mapImage: MapImageMode): void => {
  const root = document.documentElement;
  const colors = resolveColors(theme, mapImage);
  colorKeys.forEach((key) => {
    root.style.setProperty(cssVarName(key), colors[key]);
  });

  // 底圖現在的白 / 黑實際上是什麼顏色。直接寫在地圖上的字(區域名稱…)用 ink 才看得到。
  const canvas = getMapCanvas(theme, mapImage);
  root.style.setProperty("--c-map-paper", canvas.paper);
  root.style.setProperty("--c-map-ink", canvas.ink);
  // 底圖是深是淺。跟 data-theme-mode 不一樣:深色主題配原圖時,底圖還是淺的。
  // 顏色寫死、不跟主題走的圖元(車子、定位點…)靠這顆在深色底圖上補外框或換亮一點的顏色。
  root.dataset.mapCanvas = isDarkColor(canvas.paper) ? "dark" : "light";

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
  applyTheme(getTheme(readStoredThemeId()), readStoredMapImageMode());
};
