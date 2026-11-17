import styled from "styled-components";

/*
 * KENMEC 標題列標誌 (向量, 不用圖檔):
 * - 左邊的符號照原本公司標誌的結構描出來: 兩條橫槓, 加上一條「底部橫尾 → 斜線 → 頂部橫頭」的折線。
 *   座標是原圖 (1056×544) 量出來的, 先平移再縮放到 32 高。
 * - 跟原標誌不同的只有兩件事 (要調整就改下面的數字):
 *   · 粗細: 原本約 19, 這裡 W = 18, 要更粗 / 更細就改 THICK 再重算多邊形 (見下方註解)
 *   · 尾端: 原本是圓頭, 這裡每個端點都斜切成跟斜線平行的尖角 (SHARP = 15 是斜切的位移量, 0 就是直切)
 * - 右邊的字標是寬字距的大寫字母 (Archivo 展開字寬; 沒載入時退回系統無襯線體), 用 textLength 固定總寬,
 *   不管用哪套字型版面都不會跑掉
 * - 符號用品牌紅 (--c-brand), 字標跟著主題文字色, 所以深色主題不用另外轉色
 * 純 SVG, 沒有濾鏡; hover 時中間那條橫槓往右滑一點 (尊重 prefers-reduced-motion)。
 *
 * 多邊形 (原圖座標, W=18, SHARP=15):
 *   上橫槓  x 105~310, y 240~258
 *   中橫槓  x 105~312, y 281~299
 *   折線    橫尾 y 323~341 → 斜線 (跟水平夾約 50°) → 橫頭 y 199~217
 */
const Svg = styled.svg`
  display: block;
  height: 26px;
  width: auto;
  overflow: visible;

  .bar-b {
    transition: transform 0.25s ease;
  }

  button:hover & .bar-b,
  button:focus-visible & .bar-b {
    transform: translateX(12px); /* 縮放前的單位, 約 3px */
  }

  @media (prefers-reduced-motion: reduce) {
    .bar-b {
      transition: none;
    }
  }
`;

/** height: 顯示高度 (px), 預設 26 (標題列); 登入頁用大一點的。emblemOnly: 只畫左邊的符號 (手機窄螢幕) */
const BrandLogo: React.FC<{ height?: number; emblemOnly?: boolean }> = ({
  height,
  emblemOnly,
}) => (
  <Svg
    viewBox={emblemOnly ? "0 0 46 32" : "0 0 186 32"}
    role="img"
    aria-label="KENMEC"
    focusable="false"
    style={height ? { height } : undefined}
  >
    <g fill="var(--c-brand, #e2231a)" transform="scale(0.2254) translate(-105 -199)">
      <polygon points="120,240 310,240 295,258 105,258" />
      <polygon className="bar-b" points="120,281 312,281 297,299 105,299" />
      <polygon points="120,323 153.8,323 257.8,199 310,199 295,217 266.2,217 162.2,341 105,341" />
    </g>
    {emblemOnly ? null : (
      <>
    <line x1="55" y1="4" x2="55" y2="28" stroke="currentColor" strokeOpacity="0.22" />
    <text
      x="64"
      y="23"
      fill="currentColor"
      fontSize="20"
      fontWeight="700"
      textLength="120"
      lengthAdjust="spacing"
      style={{ fontFamily: '"Archivo", "Noto Sans TC", "Microsoft JhengHei", sans-serif', fontStretch: "125%" }}
    >
      KENMEC
    </text>
      </>
    )}
  </Svg>
);

export default BrandLogo;
