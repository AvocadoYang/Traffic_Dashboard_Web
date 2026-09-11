import type { ThemeConfig } from "antd";
import { c, font } from "./tokens";

// 用 ConfigProvider 一次把 antd 預設的藍色系換成灰黑白,這樣 Table 選取列、
// Checkbox、Input focus、Switch、Pagination… 全部自動跟著走,
// 不用在每個面板各自寫 CSS 去蓋掉藍色。
export const settingV2Theme: ThemeConfig = {
  token: {
    colorPrimary: c.accent,
    colorInfo: c.accent,
    colorError: c.danger,
    colorLink: c.text,
    colorText: c.text,
    colorTextSecondary: c.textSecondary,
    colorBorder: c.border,
    colorBorderSecondary: c.border,
    borderRadius: 2,
    fontFamily: font.mono,
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
    Switch: { colorPrimary: c.accent, colorPrimaryHover: "#3a3a3a" },
    Tabs: {
      itemSelectedColor: c.text,
      itemHoverColor: c.text,
      inkBarColor: c.accent,
    },
    Segmented: {
      itemSelectedBg: c.accent,
      itemSelectedColor: "#ffffff",
      itemHoverBg: c.bgMuted,
      trackBg: c.bgMuted,
    },
  },
};
