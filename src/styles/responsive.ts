/**
 * 全站唯一的 breakpoint 來源。
 *
 * mobile-first：預設值寫手機，再用兩個 min-width 往上蓋。
 *   base            < 768px
 *   mq.pad   >= 768px
 *   mq.web   >= 1024px
 *
 * 一律用這裡的 mq 寫 styled-components 的 media query，
 * 不要再用 JS 量 window.innerWidth 來決定畫面長相。
 */
export const breakpoints = {
  pad: 768,
  web: 1024,
} as const;

export const mq = {
  pad: `@media (min-width: ${breakpoints.pad}px)`,
  web: `@media (min-width: ${breakpoints.web}px)`,
} as const;
