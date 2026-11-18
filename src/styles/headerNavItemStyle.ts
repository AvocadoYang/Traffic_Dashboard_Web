import { css } from "styled-components";

// Header 上「切換頁面」的導覽選單樣式,抽出來讓其他也想長得像導覽項目的按鈕
// (目前是 MissionBtn 的任務派發按鈕)可以直接共用同一份視覺規則,
// 不用各自維護一份、改一邊忘了改另一邊。
// 精品風格: 不再全大寫 + 粗體 + 底色塊; 細字距的介面字, 目前所在頁只靠底下一條指示線
// (顏色是 --nav-indicator: 精品黑主題是品牌紅, 其他主題沿用強調色, 見 styles/luxe.css)。
export const headerNavItemBase = css`
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--c-header-text);
  font-family: var(--font-ui);
  font-size: var(--font-sm);
  letter-spacing: 0.14em;
  font-weight: 600;
  border-bottom: 2px solid transparent;
  margin: 0 var(--space-xs);
  padding: 0 var(--space-lg);
  height: var(--header-height);
  line-height: var(--header-height);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;
  box-shadow: none;

  &:hover {
    color: var(--c-text);
    background: transparent;
    border-bottom-color: var(--c-border-strong);
  }

  &:focus {
    color: var(--c-header-text);
  }
`;

export const headerNavItemActive = css`
  color: var(--c-text);
  background: transparent;
  border-bottom-color: var(--nav-indicator);
  box-shadow: none;
`;
