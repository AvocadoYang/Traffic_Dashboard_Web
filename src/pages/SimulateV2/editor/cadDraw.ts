/**
 * 畫 CAD 圖 (DXF 展開後的線和文字). 線很多 (幾萬到幾十萬條), 所以:
 * 畫面外的線不畫、縮小到不到一個像素的線不畫、太小的字不畫, 一批一批 stroke.
 */
import type { CadBackground, Point } from "../model/types";
import type { CadGeometry } from "../io/dxf/types";
import type { Frame } from "./drawing";

/** 小於幾個像素的線不畫 */
const MIN_PX = 0.75;
/** 字高小於幾個像素不畫 */
const MIN_TEXT_PX = 5;
/** 一次 stroke 最多幾段 (路徑太長瀏覽器會變慢) */
const BATCH = 20000;
/** 一次最多畫幾個字 */
const MAX_TEXTS = 4000;

const ALIGN: CanvasTextAlign[] = ["left", "center", "right"];

export function drawCad(
  c: CanvasRenderingContext2D,
  f: Frame,
  cad: CadBackground,
  g: CadGeometry,
  hidden: Uint8Array,
  offset: Point = { x: 0, y: 0 },
) {
  const { view, width, height, colors } = f;
  const s = cad.metersPerUnit * view.scale;
  if (!(s > 0)) return;
  // 圖面 (以 base 為原點) -> 螢幕: (ox + x * s, oy - y * s)
  const ox = view.x + (cad.originX + offset.x) * view.scale;
  const oy = view.y - (cad.originY + offset.y) * view.scale;
  const lx0 = -ox / s;
  const lx1 = (width - ox) / s;
  const ly0 = (oy - height) / s;
  const ly1 = oy / s;
  const minSize = MIN_PX / s;
  const { coords, polyStart, polyLayer, polyBox } = g;
  const P = polyLayer.length;

  c.save();
  c.globalAlpha = cad.opacity;
  c.strokeStyle = colors.cad;
  c.lineWidth = 1;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.beginPath();
  let batch = 0;
  for (let p = 0; p < P; p++) {
    if (hidden[polyLayer[p]]) continue;
    const b = p * 4;
    const x0 = polyBox[b];
    const y0 = polyBox[b + 1];
    const x1 = polyBox[b + 2];
    const y1 = polyBox[b + 3];
    if (x1 < lx0 || x0 > lx1 || y1 < ly0 || y0 > ly1) continue;
    if (x1 - x0 < minSize && y1 - y0 < minSize) continue;
    const i0 = polyStart[p];
    const i1 = polyStart[p + 1];
    c.moveTo(ox + coords[i0 * 2] * s, oy - coords[i0 * 2 + 1] * s);
    for (let i = i0 + 1; i < i1; i++) c.lineTo(ox + coords[i * 2] * s, oy - coords[i * 2 + 1] * s);
    batch += i1 - i0;
    if (batch > BATCH) {
      c.stroke();
      c.beginPath();
      batch = 0;
    }
  }
  c.stroke();

  // 文字
  let drawn = 0;
  c.fillStyle = colors.cad;
  for (const t of g.texts) {
    if (hidden[t.layer]) continue;
    const px = t.h * s;
    if (px < MIN_TEXT_PX) continue;
    const sx = ox + t.x * s;
    const sy = oy - t.y * s;
    // 粗略判斷在不在畫面裡 (字的長度用字數估)
    const reach = px * (t.text.length + 2);
    if (sx < -reach || sx > width + reach || sy < -reach || sy > height + reach) continue;
    if (++drawn > MAX_TEXTS) break;
    const lines = t.text.split("\n");
    const gap = px * 1.667;
    // 多行: 對齊點是整塊的上 / 中 / 下
    const first = t.va === 3 ? 0 : t.va === 2 ? -((lines.length - 1) * gap) / 2 : -(lines.length - 1) * gap;
    c.save();
    c.translate(sx, sy);
    c.rotate(-t.rot);
    c.font = `${px}px sans-serif`;
    c.textAlign = ALIGN[t.ha] ?? "left";
    c.textBaseline = t.va === 3 ? "top" : t.va === 2 ? "middle" : t.va === 1 ? "bottom" : "alphabetic";
    lines.forEach((line, k) => c.fillText(line, 0, first + k * gap));
    c.restore();
  }
  c.restore();
}
