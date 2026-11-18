// 文字對比度。
//
// 淺色主題的成功綠 / 警告黃是拿來畫色點、色塊、邊框的,放在白底上當「文字」只有 2:1 左右,
// 弱電腦、反光的螢幕上幾乎看不見。文字要另外用一顆加深過的顏色(--c-success-text /
// --c-warning-text):色相不變,往黑色方向混到夠清楚為止。深色主題本來就夠亮,原樣回傳。

const toRgb = (hex: string): [number, number, number] => {
  const v = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
};

const toHex = (rgb: number[]): string =>
  "#" +
  rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");

const luminance = (hex: string): number => {
  const [r, g, b] = toRgb(hex).map((n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * 把 fg 往黑色加深 (深色底則往白色調亮),直到對每個背景的對比度都 >= min。
 * 本來就夠清楚就原樣回傳 (不是 6 位數 hex 的值也原樣回傳)。
 */
export const ensureTextContrast = (
  fg: string,
  backgrounds: string[],
  min = 4.5,
): string => {
  const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);
  if (!isHex(fg) || !backgrounds.every(isHex)) return fg;
  const ok = (c: string) => backgrounds.every((bg) => contrastRatio(c, bg) >= min);
  if (ok(fg)) return fg;
  const base = toRgb(fg);
  // 淺色底往黑色加深, 深色底往白色調亮
  const darkBg = backgrounds.every((bg) => luminance(bg) < 0.4);
  const target = darkBg ? 255 : 0;
  for (let t = 0.05; t <= 1; t += 0.05) {
    const mixed = toHex(base.map((n) => n + (target - n) * t));
    if (ok(mixed)) return mixed;
  }
  return darkBg ? "#ffffff" : "#000000";
};
