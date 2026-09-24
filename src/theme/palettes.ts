// 全站配色的單一來源。
//
// 這裡只放「顏色的值」,不放任何 React / DOM 的東西,讓 styled-components、
// antd ConfigProvider、面板預覽都能共用同一份定義。
//
// 運作方式:每個顏色都會被寫成一顆 CSS 變數(--c-bg、--c-text-secondary…),
// 由 applyTheme 灌到 <html> 上。styled-components 那邊取的是 var(--c-xxx),
// 所以換主題只是換變數值,不需要重新掛載元件,也不用去改兩百多處寫法。
// antd 不吃 var()(它要自己算 hover / active 的衍生色),所以 ConfigProvider
// 那條路是直接吃下面這些真實 hex,見 antdTheme.ts。

export type ThemeMode = "light" | "dark";

/** 一套主題要給滿的顏色。新增欄位時記得五套主題都要補,TS 會擋。 */
export type PaletteColors = {
  /** 面板底色 */
  bg: string;
  /** 區塊 / 表頭底色 */
  bgSubtle: string;
  /** 更深一階的底色(hover、被選取) */
  bgMuted: string;
  /** 被選取的強調底色 */
  bgSelected: string;

  border: string;
  borderStrong: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  /** 強調色(選取、focus、主要按鈕) */
  accent: string;
  /** 強調色的 hover 狀態 */
  accentHover: string;
  /** 疊在 accent 上面的文字色。淺色主題是白字,深色主題要反過來用深字 */
  onAccent: string;

  /**
   * 狀態色。這幾顆刻意不跟著主題的色相走——綠色就是成功、黃色就是警告,
   * 換了操作員會看不懂。淺色主題四套共用同一組值,只有深色主題要另外調:
   * 原本的淺底(例如 #f6ffed)疊在深色面板上會變成一塊發亮的白。
   */
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;

  /** 只給刪除 / 破壞性動作 */
  danger: string;
  dangerSoft: string;

  /** 共用 Header(每一頁都會出現,所以獨立成一組,不跟面板底色綁在一起) */
  headerBg: string;
  headerText: string;
  headerBorder: string;
  headerAccent: string;
  /** Header 導覽項目 hover / active 的淡底 */
  headerAccentSoft: string;
};

export type ThemeId = "mono" | "indigo" | "teal" | "sand" | "midnight";

export type Theme = {
  id: ThemeId;
  /** i18n key,見 translation.json 的 appearance.themes */
  labelKey: string;
  mode: ThemeMode;
  colors: PaletteColors;
};

/**
 * 灰階:SettingV2 原本的配色,一個值都沒動,所以「不選主題」的人看到的
 * 畫面跟以前完全一樣。
 */
const mono: PaletteColors = {
  bg: "#ffffff",
  bgSubtle: "#fafafa",
  bgMuted: "#f0f0f0",
  bgSelected: "#e8e8e8",

  border: "#e4e4e4",
  borderStrong: "#c8c8c8",

  text: "#1c1c1c",
  textSecondary: "#5c5c5c",
  textMuted: "#949494",

  accent: "#1c1c1c",
  accentHover: "#3a3a3a",
  onAccent: "#ffffff",

  success: "#52c41a",
  successSoft: "#f6ffed",
  warning: "#faad14",
  warningSoft: "#fffbe6",

  danger: "#c0341d",
  dangerSoft: "#fbf0ed",

  headerBg: "#ffffff",
  headerText: "#595959",
  headerBorder: "#d9d9d9",
  headerAccent: "#1890ff",
  headerAccentSoft: "rgba(24, 144, 255, 0.08)",
};

/** 靛藍:最接近一般後台的觀感,底色帶一點冷灰,強調色是藍。 */
const indigo: PaletteColors = {
  bg: "#ffffff",
  bgSubtle: "#f6f8fc",
  bgMuted: "#e9eef8",
  bgSelected: "#dbe4f6",

  border: "#dbe3f0",
  borderStrong: "#b0c0dc",

  text: "#1b2536",
  textSecondary: "#4b5a72",
  textMuted: "#8695ab",

  accent: "#2f5bd0",
  accentHover: "#2449ac",
  onAccent: "#ffffff",

  success: "#52c41a",
  successSoft: "#f6ffed",
  warning: "#faad14",
  warningSoft: "#fffbe6",

  danger: "#c0341d",
  dangerSoft: "#fdf0ed",

  headerBg: "#ffffff",
  headerText: "#4b5a72",
  headerBorder: "#c6d2e8",
  headerAccent: "#2f5bd0",
  headerAccentSoft: "rgba(47, 91, 208, 0.10)",
};

/** 青綠:低彩度的冷色,長時間盯著比藍色不刺眼。 */
const teal: PaletteColors = {
  bg: "#ffffff",
  bgSubtle: "#f4faf8",
  bgMuted: "#e4f1ed",
  bgSelected: "#d5e9e2",

  border: "#d7e8e2",
  borderStrong: "#a5c9bf",

  text: "#16302a",
  textSecondary: "#3f625a",
  textMuted: "#7d9c94",

  accent: "#11776a",
  accentHover: "#0c5c52",
  onAccent: "#ffffff",

  success: "#52c41a",
  successSoft: "#f6ffed",
  warning: "#faad14",
  warningSoft: "#fffbe6",

  danger: "#bd3a20",
  dangerSoft: "#fbf0ed",

  headerBg: "#ffffff",
  headerText: "#3f625a",
  headerBorder: "#bedcd4",
  headerAccent: "#11776a",
  headerAccentSoft: "rgba(17, 119, 106, 0.10)",
};

/** 暖砂:米白底 + 棕橘強調色,整體最「不像黑白」的一套。 */
const sand: PaletteColors = {
  bg: "#fffdfa",
  bgSubtle: "#faf5ee",
  bgMuted: "#f2e9db",
  bgSelected: "#ead9c3",

  border: "#e8ddcb",
  borderStrong: "#c8b491",

  text: "#322a1e",
  textSecondary: "#6a5a44",
  textMuted: "#9c8c74",

  accent: "#a0571c",
  accentHover: "#83450f",
  onAccent: "#ffffff",

  success: "#52c41a",
  successSoft: "#f6ffed",
  warning: "#faad14",
  warningSoft: "#fffbe6",

  danger: "#b5301c",
  dangerSoft: "#fbeeea",

  headerBg: "#fffdfa",
  headerText: "#6a5a44",
  headerBorder: "#dcccb0",
  headerAccent: "#a0571c",
  headerAccentSoft: "rgba(160, 87, 28, 0.10)",
};

/**
 * 深色:唯一一套 mode = "dark"。
 * accent 是亮藍,疊在上面的字必須是深色,所以 onAccent 跟其他四套相反。
 */
const midnight: PaletteColors = {
  bg: "#17191d",
  bgSubtle: "#1d2025",
  bgMuted: "#262a31",
  bgSelected: "#30353e",

  border: "#2e333b",
  borderStrong: "#474e59",

  text: "#e6e9ee",
  textSecondary: "#a8b0bd",
  textMuted: "#737c8a",

  accent: "#5b8cf0",
  accentHover: "#7aa3f5",
  onAccent: "#0f1216",

  success: "#6abe4b",
  successSoft: "#1d2a1b",
  warning: "#e0a33a",
  warningSoft: "#2e2616",

  danger: "#ef6a55",
  dangerSoft: "#38221f",

  headerBg: "#1d2025",
  headerText: "#a8b0bd",
  headerBorder: "#3a414b",
  headerAccent: "#5b8cf0",
  headerAccentSoft: "rgba(91, 140, 240, 0.16)",
};

export const themes: Theme[] = [
  { id: "mono", labelKey: "appearance.themes.mono", mode: "light", colors: mono },
  { id: "indigo", labelKey: "appearance.themes.indigo", mode: "light", colors: indigo },
  { id: "teal", labelKey: "appearance.themes.teal", mode: "light", colors: teal },
  { id: "sand", labelKey: "appearance.themes.sand", mode: "light", colors: sand },
  { id: "midnight", labelKey: "appearance.themes.midnight", mode: "dark", colors: midnight },
];

export const DEFAULT_THEME_ID: ThemeId = "mono";

export const getTheme = (id: string | null | undefined): Theme =>
  themes.find((theme) => theme.id === id) ??
  themes.find((theme) => theme.id === DEFAULT_THEME_ID)!;

export const colorKeys = Object.keys(mono) as (keyof PaletteColors)[];

/** bgSubtle -> --c-bg-subtle */
export const cssVarName = (key: keyof PaletteColors): string =>
  `--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

/** bgSubtle -> var(--c-bg-subtle) */
export const cssVar = (key: keyof PaletteColors): string =>
  `var(${cssVarName(key)})`;
