import { css } from "styled-components";

// Header 上「切換頁面」的導覽選單樣式,抽出來讓其他也想長得像導覽項目的按鈕
// (目前是 MissionBtn 的任務派發按鈕)可以直接共用同一份視覺規則,
// 不用各自維護一份、改一邊忘了改另一邊。
export const headerNavItemBase = css`
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--c-header-text);
  font-family: "Roboto Mono", monospace;
  font-size: var(--font-sm);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  border-bottom: 3px solid transparent;
  margin: 0 var(--space-xs);
  padding: 0 var(--space-lg);
  height: var(--header-height);
  line-height: var(--header-height);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: none;

  &:hover {
    color: var(--c-header-accent);
    background: var(--c-header-accent-soft);
    border-bottom-color: var(--c-header-accent);
  }

  &:focus {
    color: var(--c-header-text);
  }
`;

export const headerNavItemActive = css`
  color: var(--c-header-accent);
  background: var(--c-header-accent-soft);
  border-bottom-color: var(--c-header-accent);
  box-shadow: inset 0 -3px 0 var(--c-header-accent);
`;
