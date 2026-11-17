import styled from "styled-components";

/**
 * 首頁側欄的標題 (車輛 / 任務), 跟登入頁同一套語言:
 * 上面一行小的寬體英文眉標 + 一小段指示線 (精品黑主題是品牌紅), 下面中文標題, 底下一條髮絲線。
 */
export const PanelTitleBar = styled.div`
  position: relative;
  width: 100%;
  padding: 2px 2px 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
  font-family: var(--font-ui);

  & * {
    font-family: inherit;
  }

  @media (max-width: 1500px) {
    display: none;
  }
`;

export const PanelEyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
  font-size: 10px;
  font-weight: 600;
  font-stretch: 125%;
  line-height: 1;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--c-text-muted);

  &::after {
    content: "";
    width: 22px;
    height: 1px;
    background: var(--nav-indicator);
  }
`;

export const PanelTitle = styled.span`
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.06em;
  color: var(--c-text);

  @media (max-width: 1200px) {
    font-size: 14px;
  }
`;

/** 標題旁邊的小圖示按鈕 (說明、切換、展開) */
export const PanelIconColor = `
  color: var(--c-text-muted);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--c-text);
  }
`;
