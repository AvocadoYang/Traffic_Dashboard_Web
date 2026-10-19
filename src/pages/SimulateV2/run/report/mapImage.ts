/**
 * 報告用的地圖圖片 (PNG): 跟結果頁的地圖同一套畫法, 但固定用淺色 (印出來是白紙),
 * 不靠畫面上那張畫布 (報告可能在別的分頁產生).
 */
import { getTheme, themes } from "@/theme";
import { fileUrl } from "../../api/simV2Api";
import { drawCad } from "../../editor/cadDraw";
import { Frame, drawBackground, drawNodes, drawPaths } from "../../editor/drawing";
import { canvasColorsOf } from "../../editor/hooks";
import { contentBounds, fitView } from "../../editor/viewMath";
import { hiddenMaskOf, loadCadGeometry } from "../../io/dxf/cadLoader";
import type { SimResult } from "../../engine/types";
import { nodeMap } from "../../model/ops";
import type { SimDoc } from "../../model/types";
import { drawDeadlock, drawHeat } from "../replayDraw";

/** 淺色主題的畫布顏色 */
export function lightCanvasColors() {
  const light = themes.find((t) => t.mode === "light") ?? getTheme(null);
  return canvasColorsOf(light, "themed");
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export interface MapImage {
  /** data:image/png;base64,... */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * heat: 有結果就畫塞車熱點 (路段依等待時間上色), 沒有就只畫佈局.
 * 底圖、DXF 讀不到就不畫, 不會讓整份報告失敗.
 */
export async function renderMapImage(projectId: string, doc: SimDoc, result: SimResult | null, width = 1600, height = 1000): Promise<MapImage | null> {
  const bounds = contentBounds({ ...doc, background: null, cad: null }) ?? contentBounds(doc);
  if (!bounds) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d");
  if (!c) return null;
  const colors = lightCanvasColors();
  const frame: Frame = { view: fitView(bounds, width, height, 40), width, height, colors };
  c.fillStyle = colors.paper;
  c.fillRect(0, 0, width, height);
  if (doc.background) {
    const img = await loadImage(fileUrl(projectId, doc.background.fileId));
    if (img) drawBackground(c, frame, doc.background, img);
  }
  if (doc.cad) {
    try {
      const g = await loadCadGeometry(projectId, doc.cad);
      drawCad(c, frame, doc.cad, g, hiddenMaskOf(g, doc.cad.hiddenLayers));
    } catch {
      // DXF 讀不到就不畫
    }
  }
  const nodes = nodeMap(doc);
  const pos = (id: string) => nodes.get(id);
  const none = new Set<string>();
  if (result) {
    c.globalAlpha = 0.45;
    drawPaths(c, frame, doc, pos, none);
    c.globalAlpha = 1;
    drawHeat(c, frame, doc, pos, result.heat, false);
    drawNodes(c, frame, { ...doc, nodes: doc.nodes.filter((n) => n.kind !== "point") }, pos, none, true);
    if (result.deadlock) drawDeadlock(c, frame, result.deadlock);
  } else {
    drawPaths(c, frame, doc, pos, none);
    drawNodes(c, frame, doc, pos, none, true);
  }
  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}
