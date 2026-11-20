import type { CSSProperties } from "react";

// 在設定頁地圖上點設備(堆疊、輸送帶、貨架、電梯、充電站)開出來的編輯對話框,
// 共用的外觀都放這裡。
//
// 這幾個對話框原本各自寫死白底 / 藍字,切到別的主題(尤其深色)顏色不會跟著變,
// 深色主題下會變成「白卡片 + 淺色字」根本看不到。這裡一律取主題的 CSS 變數;
// inline style 吃得到 var(),不像 antd 的 token。

/** 對話框裡的一張卡片 */
export const editPanelStyle: CSSProperties = {
  background: "var(--c-bg)",
  // 深色主題的陰影幾乎看不見,靠這條框線才分得出卡片的邊界
  border: "1px solid var(--c-border)",
  padding: "24px",
  borderRadius: 8,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
};

/** 左右並排、各佔一半、內容太長時自己捲動的卡片 */
export const editHalfPanelStyle: CSSProperties = {
  ...editPanelStyle,
  width: "50%",
  maxHeight: "70vh",
  overflowY: "auto",
};

/** 卡片裡再分一塊的底色(例如貨架的每一層) */
export const editSubPanelStyle: CSSProperties = {
  marginBottom: "24px",
  padding: "16px",
  background: "var(--c-bg-muted)",
  borderRadius: 6,
};

/** 對話框內容區的底色,比卡片深一階 */
export const editModalBodyStyle: CSSProperties = {
  padding: "24px",
  background: "var(--c-bg-subtle)",
};

/** 卡片標題的顏色 */
export const EDIT_TITLE_COLOR = "var(--c-header-accent)";
