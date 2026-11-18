import styled from "styled-components";

// 車輛卡片外框: 髮絲邊框 + 圓角, 頂端一層很淡的光澤 (精品黑主題才有, 見 styles/luxe.css);
// 車輛識別色改放在卡片標題的車號牌上 (見 Lists.tsx 的 AmrPlate), 卡片邊不再畫色條。
// 滑過時邊框亮一階、卡片微微浮起 (只動 transform, 不吃效能)。
export const InfoWrap = styled.div<{ $color: string; $warn: boolean }>`
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--c-bg);
  background-image: var(--panel-sheen);
  color: var(--c-text);
  font-family: var(--font-ui);
  /* 全站是 * { 等寬字 }, 每個元素各自套, 不會從這裡繼承; 卡片裡一律跟著卡片的介面字 */
  & * {
    font-family: inherit;
  }
  border: 1px solid ${({ $warn }) => ($warn ? "var(--c-danger)" : "var(--c-border)")};
  border-radius: 0;
  box-shadow: ${({ $warn }) =>
    $warn
      ? "0 0 0 3px var(--c-danger-soft), 0 1px 2px rgba(0, 0, 0, 0.04)"
      : "0 1px 2px rgba(0, 0, 0, 0.04)"};
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: ${({ $warn }) => ($warn ? "var(--c-danger)" : "var(--c-text-muted)")};
    box-shadow: ${({ $warn }) =>
      $warn
        ? "0 0 0 3px var(--c-danger-soft), 0 6px 16px rgba(0, 0, 0, 0.1)"
        : "0 6px 16px rgba(0, 0, 0, 0.1)"};
    transform: translateY(-1px);
  }
`;
