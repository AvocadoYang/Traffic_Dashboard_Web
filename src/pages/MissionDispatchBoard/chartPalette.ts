// 驗證過的預設色盤（色弱安全，相鄰兩色在 OKLab 色差 ≥ 8）。分類型圖表
// （圓餅圖）依序取用，最多 8 色，第 9 類要折進「其他」而不是再生一個色。
// 連續型/排行榜圖表（長條、折線）只代表單一數列，固定用同一個藍色即可，
// 不需要每個長條配一個顏色——長度已經表達大小了，顏色不用再重複做同一件事。
export const CATEGORICAL_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const SEQUENTIAL_BLUE = "#2a78d6";
export const OTHER_SLICE_COLOR = "#c3c2b7";
export const CHART_TEXT_SECONDARY = "#52514e";
export const CHART_GRID = "#e1e0d9";

export const MAX_PIE_SLICES = 8;

export const toPieSeries = <T extends { label: string; value: number }>(
  data: T[],
): { label: string; value: number }[] => {
  if (data.length <= MAX_PIE_SLICES) return data;

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, MAX_PIE_SLICES - 1);
  const restSum = sorted
    .slice(MAX_PIE_SLICES - 1)
    .reduce((sum, d) => sum + d.value, 0);

  return [...head, { label: "其他", value: restSum }];
};
