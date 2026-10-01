import styled from "styled-components";

// 外框跟首頁的 TitleBar 同一套:1px 邊框 + 左側 4px 色條 + 淡陰影。
// 左側色條用的是車輛自己的識別色(跟地圖上那台車同色),屬於資料,不跟主題走。
export const InfoWrap = styled.div<{ $color: string; $warn: boolean }>`
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
  color: var(--c-text);
  border: 1px solid
    ${({ $warn }) => ($warn ? "var(--c-danger)" : "var(--c-header-border)")};
  border-left: 4px solid ${({ $color }) => $color};
  border-radius: 4px;
  box-shadow: ${({ $warn }) =>
    $warn
      ? "0 0 0 1px var(--c-danger), 0 2px 8px rgba(0, 0, 0, 0.08)"
      : "0 2px 8px rgba(0, 0, 0, 0.08)"};
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-top-color: ${({ $warn }) =>
      $warn ? "var(--c-danger)" : "var(--c-header-accent)"};
    border-right-color: ${({ $warn }) =>
      $warn ? "var(--c-danger)" : "var(--c-header-accent)"};
    border-bottom-color: ${({ $warn }) =>
      $warn ? "var(--c-danger)" : "var(--c-header-accent)"};
    box-shadow: ${({ $warn }) =>
      $warn
        ? "0 0 0 1px var(--c-danger), 0 4px 12px rgba(0, 0, 0, 0.14)"
        : "0 4px 12px rgba(0, 0, 0, 0.14)"};
  }
`;
