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

  /**
   * 地圖圖層:畫在地圖底圖上面的東西(路線、點位、電梯 / 堆疊 / 貨架…)。
   *
   * 這一組是給「底圖顯示原圖」用的。原圖(掃出來的 PNG / 客戶的平面圖)是白底,
   * 所以就算是深色主題,這裡也要挑「畫在白底上看得清楚」的顏色,只帶主題的色相,
   * 不能直接拿深色主題那些很亮的強調色來用(亮黃、亮青在白底上幾乎看不到)。
   * 底圖選「跟著主題」時,深色主題的底圖會變深,要換用的那一組寫在 Theme.mapCanvas.colors。
   *
   * 有貨的黃、被預約的綠、手動的紅這些狀態色不在這裡,它們不跟主題走。
   */
  /** 一般路線 */
  mapRoad: string;
  /** 優先路線(priority 1),也是滑到路線上時的顏色。要跟 mapRoad 一眼分得開 */
  mapRoadPriority: string;
  /** 單行道中間的箭頭 */
  mapRoadArrow: string;
  /** 一般點位 */
  mapPoint: string;
  /** 可以原地旋轉的點位 */
  mapPointRotate: string;
  /** 設備沒貨 / 沒動作時的本體色(電梯、輸送帶的圖示,堆疊的底色) */
  mapDevice: string;
  /** 設備與貨架格子的外框 */
  mapDeviceBorder: string;
  /** 貨架空格的底色。半透明,底下的平面圖要透得出來 */
  mapCell: string;
  /** 滑到貨架空格 / 設備上的底色 */
  mapCellHover: string;
  /** 貨架空格上的字 */
  mapCellText: string;
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

/** PaletteColors 裡畫在地圖底圖上的那一組 */
export type MapColors = Pick<
  PaletteColors,
  | "mapRoad"
  | "mapRoadPriority"
  | "mapRoadArrow"
  | "mapPoint"
  | "mapPointRotate"
  | "mapDevice"
  | "mapDeviceBorder"
  | "mapCell"
  | "mapCellHover"
  | "mapCellText"
>;

/**
 * 底圖的顯示方式(使用者在外觀面板選):
 *   themed   —— 把底圖重新上色,跟著主題走(預設)
 *   original —— 原圖,一個像素都不動
 */
export type MapImageMode = "themed" | "original";

/** 底圖選「跟著主題」時,這套主題要把底圖變成什麼樣子 */
export type MapCanvas = {
  /** 底圖上的白(掃完圖那一大片空白)要變成的顏色 */
  paper: string;
  /** 底圖上的黑(牆、障礙物)要變成的顏色。中間的灰階會落在 paper 跟 ink 之間 */
  ink: string;
  /**
   * 底圖重新上色之後,畫在上面的地圖色要換掉哪些。
   * 淺色主題的底圖還是淺的,不用換;深色主題的底圖變深了,colors 裡那組
   * 給白底用的顏色會看不到,所以要另外給一整組。
   */
  colors?: MapColors;
};

export type Theme = {
  id: ThemeId;
  /** i18n key,見 translation.json 的 appearance.themes */
  labelKey: string;
  mode: ThemeMode;
  colors: PaletteColors;
  mapCanvas: MapCanvas;
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

  mapRoad: "#02ddff",
  mapRoadPriority: "#ff9646",
  mapRoadArrow: "#f0c381",
  mapPoint: "#0d0d12",
  mapPointRotate: "#ff15fb",
  mapDevice: "#999999",
  mapDeviceBorder: "#727272",
  mapCell: "#f5f5f580",
  mapCellHover: "#e8e8e8b3",
  mapCellText: "#333333",
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

  mapRoad: "#4a78e6",
  mapRoadPriority: "#f2913d",
  mapRoadArrow: "#f4bd7c",
  mapPoint: "#1f3fa8",
  mapPointRotate: "#d43fd9",
  mapDevice: "#8f9db9",
  mapDeviceBorder: "#4f6cb8",
  mapCell: "rgba(220, 229, 248, 0.55)",
  mapCellHover: "rgba(196, 211, 244, 0.8)",
  mapCellText: "#1b2536",
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

  mapRoad: "#17a392",
  mapRoadPriority: "#ef8a3c",
  mapRoadArrow: "#f3bb82",
  mapPoint: "#0c5c52",
  mapPointRotate: "#c64bd6",
  mapDevice: "#8caaa2",
  mapDeviceBorder: "#3d8a7c",
  mapCell: "rgba(215, 238, 232, 0.55)",
  mapCellHover: "rgba(187, 226, 216, 0.8)",
  mapCellText: "#16302a",
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

  mapRoad: "#c27a2c",
  mapRoadPriority: "#2491ab",
  mapRoadArrow: "#8cc7d6",
  mapPoint: "#83450f",
  mapPointRotate: "#b545c9",
  mapDevice: "#ab9c84",
  mapDeviceBorder: "#9a7340",
  mapCell: "rgba(242, 229, 208, 0.55)",
  mapCellHover: "rgba(234, 213, 181, 0.8)",
  mapCellText: "#322a1e",
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

  mapRoad: "#4f82ee",
  mapRoadPriority: "#e58b2f",
  mapRoadArrow: "#f0bb7e",
  mapPoint: "#2449ac",
  mapPointRotate: "#cf4be0",
  mapDevice: "#7c8594",
  mapDeviceBorder: "#48608f",
  mapCell: "rgba(214, 223, 240, 0.55)",
  mapCellHover: "rgba(186, 201, 230, 0.8)",
  mapCellText: "#17191d",
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

  mapRoad: "#e0558a",
  mapRoadPriority: "#1fa59b",
  mapRoadArrow: "#86d1cb",
  mapPoint: "#a62a56",
  mapPointRotate: "#6b62f0",
  mapDevice: "#b998a5",
  mapDeviceBorder: "#b8607f",
  mapCell: "rgba(250, 220, 229, 0.55)",
  mapCellHover: "rgba(245, 196, 212, 0.8)",
  mapCellText: "#3b1f29",
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

  mapRoad: "#79a323",
  mapRoadPriority: "#e07b39",
  mapRoadArrow: "#efb68e",
  mapPoint: "#435f14",
  mapPointRotate: "#b948d1",
  mapDevice: "#a0ab83",
  mapDeviceBorder: "#6f8a35",
  mapCell: "rgba(228, 238, 203, 0.55)",
  mapCellHover: "rgba(210, 226, 173, 0.8)",
  mapCellText: "#262e17",
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

  mapRoad: "#8a63e0",
  mapRoadPriority: "#ea8a3a",
  mapRoadArrow: "#f2bd8a",
  mapPoint: "#5535a3",
  mapPointRotate: "#e0409a",
  mapDevice: "#a59ac6",
  mapDeviceBorder: "#7a62b8",
  mapCell: "rgba(233, 225, 250, 0.55)",
  mapCellHover: "rgba(216, 203, 246, 0.8)",
  mapCellText: "#261f3a",
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

  mapRoad: "#14a89a",
  mapRoadPriority: "#f0823c",
  mapRoadArrow: "#f4b98c",
  mapPoint: "#0c6b62",
  mapPointRotate: "#d14fd6",
  mapDevice: "#6f97a7",
  mapDeviceBorder: "#2f7f8f",
  mapCell: "rgba(203, 233, 238, 0.55)",
  mapCellHover: "rgba(168, 216, 225, 0.8)",
  mapCellText: "#0b1a26",
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

  mapRoad: "#e2711d",
  mapRoadPriority: "#2b93cf",
  mapRoadArrow: "#8ec6e8",
  mapPoint: "#a3470b",
  mapPointRotate: "#c549c9",
  mapDevice: "#9a8476",
  mapDeviceBorder: "#a8643a",
  mapCell: "rgba(246, 226, 210, 0.55)",
  mapCellHover: "rgba(239, 204, 178, 0.8)",
  mapCellText: "#1c1613",
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

  mapRoad: "#1aa85b",
  mapRoadPriority: "#d4a514",
  mapRoadArrow: "#e6cc74",
  mapPoint: "#0c6b35",
  mapPointRotate: "#d24bd0",
  mapDevice: "#6f9a7b",
  mapDeviceBorder: "#2f8a4a",
  mapCell: "rgba(205, 240, 214, 0.55)",
  mapCellHover: "rgba(168, 227, 184, 0.8)",
  mapCellText: "#0a2a12",
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

  mapRoad: "#f0409a",
  mapRoadPriority: "#10b4cf",
  mapRoadArrow: "#7fdcea",
  mapPoint: "#b01868",
  mapPointRotate: "#8b5cf6",
  mapDevice: "#8d7bb5",
  mapDeviceBorder: "#8a4fc8",
  mapCell: "rgba(236, 222, 255, 0.55)",
  mapCellHover: "rgba(218, 194, 252, 0.8)",
  mapCellText: "#2a1650",
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

  mapRoad: "#2f6aa6",
  mapRoadPriority: "#d99a00",
  mapRoadArrow: "#ecc766",
  mapPoint: "#12355b",
  mapPointRotate: "#c94fd0",
  mapDevice: "#7f9dbd",
  mapDeviceBorder: "#2f6aa6",
  mapCell: "rgba(210, 228, 246, 0.55)",
  mapCellHover: "rgba(178, 207, 238, 0.8)",
  mapCellText: "#12355b",
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

  mapRoad: "#0050ff",
  mapRoadPriority: "#e65100",
  mapRoadArrow: "#e65100",
  mapPoint: "#000000",
  mapPointRotate: "#c400c4",
  mapDevice: "#5c5c5c",
  mapDeviceBorder: "#000000",
  mapCell: "rgba(255, 255, 255, 0.75)",
  mapCellHover: "rgba(255, 212, 0, 0.5)",
  mapCellText: "#000000",
};

// ── 底圖跟著主題時,深色主題畫在(變深的)底圖上的地圖色 ──
// 底圖深了,所以這裡可以直接用主題那些亮的強調色;點位、外框、字都要是淺色。

const midnightOnDarkMap: MapColors = {
  mapRoad: "#5b8cf0",
  mapRoadPriority: "#f0a04b",
  mapRoadArrow: "#f5c98f",
  mapPoint: "#dfe6f5",
  mapPointRotate: "#f06fe6",
  mapDevice: "#6b7483",
  mapDeviceBorder: "#9aa6bd",
  mapCell: "rgba(91, 140, 240, 0.1)",
  mapCellHover: "rgba(91, 140, 240, 0.28)",
  mapCellText: "#e6e9ee",
};

const oceanOnDarkMap: MapColors = {
  mapRoad: "#2ec4b6",
  mapRoadPriority: "#f59e5b",
  mapRoadArrow: "#f8c79d",
  mapPoint: "#d9f1f5",
  mapPointRotate: "#f07ad8",
  mapDevice: "#5f8797",
  mapDeviceBorder: "#8fb8c6",
  mapCell: "rgba(46, 196, 182, 0.1)",
  mapCellHover: "rgba(46, 196, 182, 0.28)",
  mapCellText: "#e3f2f7",
};

const emberOnDarkMap: MapColors = {
  mapRoad: "#f08a3c",
  mapRoadPriority: "#4fb3f0",
  mapRoadArrow: "#a5d6f5",
  mapPoint: "#f5e6da",
  mapPointRotate: "#e87ae0",
  mapDevice: "#8c786b",
  mapDeviceBorder: "#c2a999",
  mapCell: "rgba(240, 138, 60, 0.1)",
  mapCellHover: "rgba(240, 138, 60, 0.28)",
  mapCellText: "#f3e9e2",
};

const terminalOnDarkMap: MapColors = {
  mapRoad: "#33d17a",
  mapRoadPriority: "#e6c229",
  mapRoadArrow: "#f0db7e",
  mapPoint: "#c8f7d0",
  mapPointRotate: "#f07ad8",
  mapDevice: "#4f8a5e",
  mapDeviceBorder: "#86c995",
  mapCell: "rgba(51, 209, 122, 0.1)",
  mapCellHover: "rgba(51, 209, 122, 0.26)",
  mapCellText: "#c8f7d0",
};

const neonOnDarkMap: MapColors = {
  mapRoad: "#ff4fa3",
  mapRoadPriority: "#22d3ee",
  mapRoadArrow: "#8be8f5",
  mapPoint: "#f0e9ff",
  mapPointRotate: "#b18cff",
  mapDevice: "#7d6aa8",
  mapDeviceBorder: "#b9a9dc",
  mapCell: "rgba(255, 79, 163, 0.1)",
  mapCellHover: "rgba(255, 79, 163, 0.28)",
  mapCellText: "#f0e9ff",
};

const blueprintOnDarkMap: MapColors = {
  mapRoad: "#a8cdf2",
  mapRoadPriority: "#ffd166",
  mapRoadArrow: "#ffe3a1",
  mapPoint: "#f2f7fc",
  mapPointRotate: "#ff9bd6",
  mapDevice: "#5f8fc0",
  mapDeviceBorder: "#9dbcda",
  mapCell: "rgba(255, 255, 255, 0.08)",
  mapCellHover: "rgba(255, 255, 255, 0.22)",
  mapCellText: "#f2f7fc",
};

const contrastOnDarkMap: MapColors = {
  mapRoad: "#00b7ff",
  mapRoadPriority: "#ff8c1a",
  mapRoadArrow: "#ff8c1a",
  mapPoint: "#ffffff",
  mapPointRotate: "#ff5cff",
  mapDevice: "#8c8c8c",
  mapDeviceBorder: "#ffffff",
  mapCell: "rgba(255, 255, 255, 0.08)",
  mapCellHover: "rgba(255, 212, 0, 0.35)",
  mapCellText: "#ffffff",
};

// 排列順序就是外觀面板上卡片的順序:先淺色、再深色,越後面越特別。
export const themes: Theme[] = [
  {
    id: "mono",
    labelKey: "appearance.themes.mono",
    mode: "light",
    colors: mono,
    // 灰階不動底圖:白還是白、黑還是黑
    mapCanvas: { paper: "#ffffff", ink: "#000000" },
  },
  {
    id: "indigo",
    labelKey: "appearance.themes.indigo",
    mode: "light",
    colors: indigo,
    mapCanvas: { paper: indigo.bgSubtle, ink: indigo.text },
  },
  {
    id: "teal",
    labelKey: "appearance.themes.teal",
    mode: "light",
    colors: teal,
    mapCanvas: { paper: teal.bgSubtle, ink: teal.text },
  },
  {
    id: "sand",
    labelKey: "appearance.themes.sand",
    mode: "light",
    colors: sand,
    mapCanvas: { paper: sand.bgSubtle, ink: sand.text },
  },
  {
    id: "sakura",
    labelKey: "appearance.themes.sakura",
    mode: "light",
    colors: sakura,
    mapCanvas: { paper: sakura.bgSubtle, ink: sakura.text },
  },
  {
    id: "matcha",
    labelKey: "appearance.themes.matcha",
    mode: "light",
    colors: matcha,
    mapCanvas: { paper: matcha.bgSubtle, ink: matcha.text },
  },
  {
    id: "lavender",
    labelKey: "appearance.themes.lavender",
    mode: "light",
    colors: lavender,
    mapCanvas: { paper: lavender.bgSubtle, ink: lavender.text },
  },
  {
    id: "midnight",
    labelKey: "appearance.themes.midnight",
    mode: "dark",
    colors: midnight,
    mapCanvas: {
      paper: midnight.bg,
      ink: midnight.text,
      colors: midnightOnDarkMap,
    },
  },
  {
    id: "ocean",
    labelKey: "appearance.themes.ocean",
    mode: "dark",
    colors: ocean,
    mapCanvas: { paper: ocean.bg, ink: ocean.text, colors: oceanOnDarkMap },
  },
  {
    id: "ember",
    labelKey: "appearance.themes.ember",
    mode: "dark",
    colors: ember,
    mapCanvas: { paper: ember.bg, ink: ember.text, colors: emberOnDarkMap },
  },
  {
    id: "terminal",
    labelKey: "appearance.themes.terminal",
    mode: "dark",
    colors: terminal,
    mapCanvas: {
      paper: terminal.bg,
      ink: terminal.text,
      colors: terminalOnDarkMap,
    },
  },
  {
    id: "neon",
    labelKey: "appearance.themes.neon",
    mode: "dark",
    colors: neon,
    mapCanvas: { paper: neon.bg, ink: neon.text, colors: neonOnDarkMap },
  },
  {
    id: "blueprint",
    labelKey: "appearance.themes.blueprint",
    mode: "dark",
    colors: blueprint,
    mapCanvas: {
      paper: blueprint.bg,
      ink: blueprint.text,
      colors: blueprintOnDarkMap,
    },
  },
  {
    id: "contrast",
    labelKey: "appearance.themes.contrast",
    mode: "dark",
    colors: contrast,
    mapCanvas: {
      paper: contrast.bg,
      ink: contrast.text,
      colors: contrastOnDarkMap,
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "mono";

export const getTheme = (id: string | null | undefined): Theme =>
  themes.find((theme) => theme.id === id) ??
  themes.find((theme) => theme.id === DEFAULT_THEME_ID)!;

export const colorKeys = Object.keys(mono) as (keyof PaletteColors)[];

export const DEFAULT_MAP_IMAGE_MODE: MapImageMode = "themed";

/** 原圖:白就是白、黑就是黑 */
const ORIGINAL_MAP_CANVAS = { paper: "#ffffff", ink: "#000000" };

/** 目前底圖的白 / 黑實際上是什麼顏色 */
export const getMapCanvas = (
  theme: Theme,
  mapImage: MapImageMode,
): { paper: string; ink: string } =>
  mapImage === "themed" ? theme.mapCanvas : ORIGINAL_MAP_CANVAS;

/** 這套主題在目前的底圖顯示方式下,實際要用的顏色 */
export const resolveColors = (
  theme: Theme,
  mapImage: MapImageMode,
): PaletteColors =>
  mapImage === "themed" && theme.mapCanvas.colors
    ? { ...theme.colors, ...theme.mapCanvas.colors }
    : theme.colors;

/** bgSubtle -> --c-bg-subtle */
export const cssVarName = (key: keyof PaletteColors): string =>
  `--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

/** bgSubtle -> var(--c-bg-subtle) */
export const cssVar = (key: keyof PaletteColors): string =>
  `var(${cssVarName(key)})`;
