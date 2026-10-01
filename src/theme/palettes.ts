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

/** 一套主題要給滿的顏色。新增欄位時記得每一套主題都要補,TS 會擋。 */
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

export type ThemeId =
  | "mono"
  | "indigo"
  | "teal"
  | "sand"
  | "sakura"
  | "matcha"
  | "lavender"
  | "midnight"
  | "ocean"
  | "ember"
  | "terminal"
  | "neon"
  | "blueprint"
  | "contrast";

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
 * 深夜:最中性的一套深色。
 * 深色主題的 accent 都是亮色,疊在上面的字必須是深色,所以 onAccent 跟淺色主題相反。
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

/** 櫻花:帶粉的白底 + 玫瑰紅強調色,淺色主題裡最柔的一套。 */
const sakura: PaletteColors = {
  bg: "#fffafb",
  bgSubtle: "#fdf1f4",
  bgMuted: "#f9e1e8",
  bgSelected: "#f4cfda",

  border: "#f1d5dd",
  borderStrong: "#dda3b5",

  text: "#3b1f29",
  textSecondary: "#75505d",
  textMuted: "#a07c8a",

  accent: "#c8386b",
  accentHover: "#a62a56",
  onAccent: "#ffffff",

  success: "#52c41a",
  successSoft: "#f6ffed",
  warning: "#faad14",
  warningSoft: "#fffbe6",

  danger: "#c0341d",
  dangerSoft: "#fdeeea",

  headerBg: "#fffafb",
  headerText: "#75505d",
  headerBorder: "#e9bfcc",
  headerAccent: "#c8386b",
  headerAccentSoft: "rgba(200, 56, 107, 0.10)",
};

/** 抹茶:米白底 + 橄欖綠,比青綠更暖、更沉。 */
const matcha: PaletteColors = {
  bg: "#fcfdf8",
  bgSubtle: "#f4f7ea",
  bgMuted: "#e6edd3",
  bgSelected: "#d8e3bd",

  border: "#dbe4c4",
  borderStrong: "#afc086",

  text: "#262e17",
  textSecondary: "#55623a",
  textMuted: "#7f8c63",

  accent: "#56781c",
  accentHover: "#435f14",
  onAccent: "#ffffff",

  success: "#52c41a",
  successSoft: "#f6ffed",
  warning: "#faad14",
  warningSoft: "#fffbe6",

  danger: "#bd3a20",
  dangerSoft: "#fbf0ed",

  headerBg: "#fcfdf8",
  headerText: "#55623a",
  headerBorder: "#c5d3a2",
  headerAccent: "#56781c",
  headerAccentSoft: "rgba(86, 120, 28, 0.12)",
};

/** 薰衣草:淡紫底 + 紫色強調色。 */
const lavender: PaletteColors = {
  bg: "#fdfcff",
  bgSubtle: "#f6f3fd",
  bgMuted: "#ebe5fa",
  bgSelected: "#ddd3f5",

  border: "#e0d8f3",
  borderStrong: "#b6a5de",

  text: "#261f3a",
  textSecondary: "#584d78",
  textMuted: "#8a7fa8",

  accent: "#6b46c1",
  accentHover: "#5535a3",
  onAccent: "#ffffff",

  success: "#52c41a",
  successSoft: "#f6ffed",
  warning: "#faad14",
  warningSoft: "#fffbe6",

  danger: "#c0341d",
  dangerSoft: "#fdf0ed",

  headerBg: "#fdfcff",
  headerText: "#584d78",
  headerBorder: "#cfc3ec",
  headerAccent: "#6b46c1",
  headerAccentSoft: "rgba(107, 70, 193, 0.10)",
};

/** 深海:深藍綠的底 + 青綠強調色,比「深夜」更有顏色。 */
const ocean: PaletteColors = {
  bg: "#0b1a26",
  bgSubtle: "#0f2233",
  bgMuted: "#163042",
  bgSelected: "#1e3f55",

  border: "#1f4259",
  borderStrong: "#356a88",

  text: "#e3f2f7",
  textSecondary: "#9fc3d1",
  textMuted: "#6f97a7",

  accent: "#2ec4b6",
  accentHover: "#5fd8cc",
  onAccent: "#04201d",

  success: "#6abe4b",
  successSoft: "#12301f",
  warning: "#e0a33a",
  warningSoft: "#33301a",

  danger: "#ff7a66",
  dangerSoft: "#3a2022",

  headerBg: "#0f2233",
  headerText: "#9fc3d1",
  headerBorder: "#2b566f",
  headerAccent: "#2ec4b6",
  headerAccentSoft: "rgba(46, 196, 182, 0.16)",
};

/** 餘燼:暖色的炭黑底 + 橘色強調色,長時間看比冷色深色主題不刺眼。 */
const ember: PaletteColors = {
  bg: "#1c1613",
  bgSubtle: "#231c18",
  bgMuted: "#2e2520",
  bgSelected: "#3b2f28",

  border: "#3d302a",
  borderStrong: "#6b5142",

  text: "#f3e9e2",
  textSecondary: "#c7b3a6",
  textMuted: "#9a8476",

  accent: "#f08a3c",
  accentHover: "#f5a566",
  onAccent: "#1f0f04",

  success: "#6abe4b",
  successSoft: "#222b18",
  warning: "#e8c04a",
  warningSoft: "#33291a",

  danger: "#ff6f61",
  dangerSoft: "#3b201c",

  headerBg: "#231c18",
  headerText: "#c7b3a6",
  headerBorder: "#54423a",
  headerAccent: "#f08a3c",
  headerAccentSoft: "rgba(240, 138, 60, 0.16)",
};

/** 終端機:黑底綠字,老式 CRT 螢幕的感覺。連一般文字都帶綠。 */
const terminal: PaletteColors = {
  bg: "#0a0e0a",
  bgSubtle: "#0f150f",
  bgMuted: "#162016",
  bgSelected: "#1e2d1e",

  border: "#1f3a24",
  borderStrong: "#2f6b3c",

  text: "#c8f7d0",
  textSecondary: "#86c995",
  textMuted: "#5f9a6d",

  accent: "#33d17a",
  accentHover: "#57e394",
  onAccent: "#04130a",

  success: "#b4e639",
  successSoft: "#232e12",
  warning: "#e6c229",
  warningSoft: "#2e2a14",

  danger: "#ff6b5e",
  dangerSoft: "#331a17",

  headerBg: "#0f150f",
  headerText: "#86c995",
  headerBorder: "#27502f",
  headerAccent: "#33d17a",
  headerAccentSoft: "rgba(51, 209, 122, 0.14)",
};

/** 霓虹:紫黑底,設定頁是桃紅、上方工具列與首頁是青色,兩個強調色刻意撞色。 */
const neon: PaletteColors = {
  bg: "#120b1f",
  bgSubtle: "#181029",
  bgMuted: "#221638",
  bgSelected: "#2e1d4b",

  border: "#3a2460",
  borderStrong: "#5c3a94",

  text: "#f0e9ff",
  textSecondary: "#b9a9dc",
  textMuted: "#8d7bb5",

  accent: "#ff4fa3",
  accentHover: "#ff77b9",
  onAccent: "#1a0613",

  success: "#5fe08a",
  successSoft: "#1a2f2a",
  warning: "#ffc857",
  warningSoft: "#33291f",

  danger: "#ff6b6b",
  dangerSoft: "#3a1a2a",

  headerBg: "#181029",
  headerText: "#b9a9dc",
  headerBorder: "#4a2d7a",
  headerAccent: "#22d3ee",
  headerAccentSoft: "rgba(34, 211, 238, 0.14)",
};

/** 藍圖:工程藍圖的藍底白線,強調色是鉛筆黃。 */
const blueprint: PaletteColors = {
  bg: "#12355b",
  bgSubtle: "#163f6b",
  bgMuted: "#1d4c7e",
  bgSelected: "#265a91",

  border: "#2f6aa6",
  borderStrong: "#6aa0d6",

  text: "#f2f7fc",
  textSecondary: "#c3d8ec",
  textMuted: "#9dbcda",

  accent: "#ffd166",
  accentHover: "#ffe099",
  onAccent: "#12263a",

  success: "#8fe38a",
  successSoft: "#1d4f5a",
  warning: "#ff9f43",
  warningSoft: "#4a4140",

  danger: "#ff9c8f",
  dangerSoft: "#4a3350",

  headerBg: "#163f6b",
  headerText: "#c3d8ec",
  headerBorder: "#3a78b8",
  headerAccent: "#ffd166",
  headerAccentSoft: "rgba(255, 209, 102, 0.16)",
};

/** 高對比:純黑底、純白字、黃色強調色。給現場光線很亮或螢幕品質不好的地方用。 */
const contrast: PaletteColors = {
  bg: "#000000",
  bgSubtle: "#0a0a0a",
  bgMuted: "#1a1a1a",
  bgSelected: "#2b2b2b",

  border: "#5c5c5c",
  borderStrong: "#a0a0a0",

  text: "#ffffff",
  textSecondary: "#e0e0e0",
  textMuted: "#b0b0b0",

  accent: "#ffd400",
  accentHover: "#ffe14d",
  onAccent: "#000000",

  success: "#5ee06a",
  successSoft: "#0f2f10",
  warning: "#ff8c1a",
  warningSoft: "#331c00",

  danger: "#ff6659",
  dangerSoft: "#3a1210",

  headerBg: "#000000",
  headerText: "#e0e0e0",
  headerBorder: "#7a7a7a",
  headerAccent: "#ffd400",
  headerAccentSoft: "rgba(255, 212, 0, 0.18)",
};

// 排列順序就是外觀面板上卡片的順序:先淺色、再深色,越後面越特別。
export const themes: Theme[] = [
  { id: "mono", labelKey: "appearance.themes.mono", mode: "light", colors: mono },
  { id: "indigo", labelKey: "appearance.themes.indigo", mode: "light", colors: indigo },
  { id: "teal", labelKey: "appearance.themes.teal", mode: "light", colors: teal },
  { id: "sand", labelKey: "appearance.themes.sand", mode: "light", colors: sand },
  { id: "sakura", labelKey: "appearance.themes.sakura", mode: "light", colors: sakura },
  { id: "matcha", labelKey: "appearance.themes.matcha", mode: "light", colors: matcha },
  { id: "lavender", labelKey: "appearance.themes.lavender", mode: "light", colors: lavender },
  { id: "midnight", labelKey: "appearance.themes.midnight", mode: "dark", colors: midnight },
  { id: "ocean", labelKey: "appearance.themes.ocean", mode: "dark", colors: ocean },
  { id: "ember", labelKey: "appearance.themes.ember", mode: "dark", colors: ember },
  { id: "terminal", labelKey: "appearance.themes.terminal", mode: "dark", colors: terminal },
  { id: "neon", labelKey: "appearance.themes.neon", mode: "dark", colors: neon },
  { id: "blueprint", labelKey: "appearance.themes.blueprint", mode: "dark", colors: blueprint },
  { id: "contrast", labelKey: "appearance.themes.contrast", mode: "dark", colors: contrast },
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
