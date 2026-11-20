/** "rgba(r, g, b, a)" -> "rgb(r, g, b)"; 不是 rgb/rgba 格式就原樣回傳 */
export const toOpaque = (color: string) => {
  const rgb = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (!rgb) return color;
  const [, r, g, b] = rgb;
  return `rgb(${r}, ${g}, ${b})`;
};
