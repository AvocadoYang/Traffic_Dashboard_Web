import { FC, memo } from "react";
import styled, { keyframes } from "styled-components";
import { FOCUS_MARKER_MS } from "./focusLocation";

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(10px); }
`;

const ring = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
`;

const fade = keyframes`
  0%, 80% { opacity: 1; }
  100% { opacity: 0; }
`;

// 座標是底圖像素 (跟著畫布平移縮放); 內容用 1/scale 反向縮放, 放大縮小時箭頭大小不變
const Anchor = styled.div.attrs<{ $x: number; $y: number }>(({ $x, $y }) => ({
  style: { left: $x, top: $y },
}))<{ $x: number; $y: number }>`
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 300000;
  animation: ${fade} ${FOCUS_MARKER_MS}ms linear forwards;
`;

const Inner = styled.div.attrs<{ $inv: number }>(({ $inv }) => ({
  style: { transform: `scale(${$inv})` },
}))<{ $inv: number }>`
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
`;

const Ring = styled.span`
  position: absolute;
  left: 0;
  top: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid var(--c-header-accent, #1677ff);
  animation: ${ring} 1.2s ease-out infinite;
`;

const ArrowWrap = styled.div`
  position: absolute;
  left: -16px;
  /* 箭頭尖端貼在目標上方一點點 */
  top: -62px;
  animation: ${bounce} 0.7s ease-in-out infinite;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
`;

/** 指向目標位置的箭頭 + 擴散的圈圈, 放在畫布最上層 DOM */
const FocusMarker: FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => (
  <Anchor $x={x} $y={y}>
    <Inner $inv={1 / scale}>
      <Ring />
      <ArrowWrap>
        <svg width="32" height="48" viewBox="0 0 32 48" aria-hidden>
          <path
            d="M16 46 L3 26 H11 V2 H21 V26 H29 Z"
            fill="var(--c-header-accent, #1677ff)"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      </ArrowWrap>
    </Inner>
  </Anchor>
);

export default memo(FocusMarker);
