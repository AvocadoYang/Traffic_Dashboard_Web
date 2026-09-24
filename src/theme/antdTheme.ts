import { theme as antdTheme, type ThemeConfig } from "antd";
import type { Theme } from "./palettes";

// antd 的 token 只能吃真實色碼,不能吃 var(--c-xxx):它會拿這些值去算 hover、
// active、disabled 的衍生色(TinyColor),餵 var() 進去會算出 NaN。
// 所以 styled-components 那條路走 CSS 變數,antd 這條路走這裡的真實 hex,
// 兩邊的來源都是同一份 palette,不會各走各的。
export const buildAntdTheme = (theme: Theme): ThemeConfig => {
  const c = theme.colors;
  return {
    // 深色主題要換演算法,否則 antd 自己算出來的彈窗、下拉、disabled 底色
    // 仍然是淺色的,會在深色面板上開出一塊白。
    algorithm:
      theme.mode === "dark"
        ? antdTheme.darkAlgorithm
        : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: c.accent,
      colorInfo: c.accent,
      colorError: c.danger,
      colorLink: c.accent,
      colorText: c.text,
      colorTextSecondary: c.textSecondary,
      colorBorder: c.border,
      colorBorderSecondary: c.border,
      colorBgBase: c.bg,
      colorBgContainer: c.bg,
      colorBgElevated: c.bg,
      colorBgLayout: c.bgSubtle,
      borderRadius: 2,
      fontFamily: `"Roboto Mono", ui-monospace, monospace`,
      fontSize: 13,
      controlHeight: 32,
    },
    components: {
      Table: {
        headerBg: c.bgMuted,
        headerColor: c.textSecondary,
        rowSelectedBg: c.bgSelected,
        rowSelectedHoverBg: c.bgMuted,
        rowHoverBg: c.bgSubtle,
        borderColor: c.border,
        headerSplitColor: c.border,
      },
      Menu: {
        itemSelectedBg: c.bgSelected,
        itemSelectedColor: c.text,
        itemHoverBg: c.bgSubtle,
        itemHoverColor: c.text,
        subMenuItemBg: "transparent",
        itemBorderRadius: 0,
        itemMarginInline: 0,
        itemMarginBlock: 0,
      },
      Button: {
        primaryShadow: "none",
        defaultShadow: "none",
        dangerShadow: "none",
      },
      Input: { activeShadow: "none" },
      Select: { optionSelectedBg: c.bgSelected },
      Switch: { colorPrimary: c.accent, colorPrimaryHover: c.accentHover },
      Tabs: {
        itemSelectedColor: c.text,
        itemHoverColor: c.text,
        inkBarColor: c.accent,
      },
      Segmented: {
        itemSelectedBg: c.accent,
        itemSelectedColor: c.onAccent,
        itemHoverBg: c.bgMuted,
        trackBg: c.bgMuted,
      },
    },
  };
};

/**
 * 給舊頁(首頁、模擬、紀錄…)用的 antd 主題,刻意比 buildAntdTheme 保守很多:
 *
 * - 主色取 headerAccent 而不是 accent。灰階主題的 accent 是黑色(SettingV2 的
 *   設計),套到首頁會把原本的藍色按鈕、選取狀態全部變黑;headerAccent 在灰階
 *   底下就是 antd 原本的 #1890ff,所以預設主題的首頁看起來跟以前一樣。
 * - 不碰字體、圓角、控制項高度。那些是 SettingV2 的排版決定,舊頁沒有跟著調過。
 *
 * 真正的價值在深色主題:algorithm 換成 darkAlgorithm 之後,首頁的表格、下拉、
 * 彈窗才不會在深色底上開出一塊白。
 */
export const buildAppAntdTheme = (theme: Theme): ThemeConfig => {
  const c = theme.colors;
  return {
    algorithm:
      theme.mode === "dark"
        ? antdTheme.darkAlgorithm
        : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: c.headerAccent,
      colorInfo: c.headerAccent,
      colorError: c.danger,
      colorText: c.text,
      colorTextSecondary: c.textSecondary,
      colorBorder: c.border,
      colorBorderSecondary: c.border,
      colorBgBase: c.bg,
      colorBgContainer: c.bg,
      colorBgElevated: c.bg,
      colorBgLayout: c.bgSubtle,
    },
  };
};
