import styled from "styled-components";

// 地圖上其他圖層的 z-index 各自為政、最高到過 300000(見 AllStack.tsx)，
// 提示標籤必須確保永遠疊在最上層，所以取一個遠高於現有圖層的值。
export const TOOLTIP_Z_INDEX = 999999;

// 共用的懸浮標籤樣式：點位用藍色、路徑用紅色，
// 「附近點位/路徑」扣離排列的 cluster 與「精確 hover」單一標籤共用這份樣式。
export const HOVER_LABEL_ACCENT = {
  blue: { main: "#1890ff", glow: "rgba(24, 144, 255, 0.5)" },
  red: { main: "#ff4d4f", glow: "rgba(255, 77, 79, 0.5)" },
} as const;

export const HoverLabel = styled.div<{
  $accent: keyof typeof HOVER_LABEL_ACCENT;
}>`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  background: rgba(17, 24, 39, 0.88);
  border: 1px solid ${({ $accent }) => HOVER_LABEL_ACCENT[$accent].main};
  color: #ffffff;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  border-radius: 10px;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.35),
    0 0 4px ${({ $accent }) => HOVER_LABEL_ACCENT[$accent].glow};
`;
