/**
 * 畫布地圖的畫法。外觀照舊地圖 (DOM 版) 的尺寸和顏色, 但全部直接畫在 canvas 上:
 * 點位、路線動輒好幾百個, 平移縮放時整張重畫比幾百個 DOM 元素一起排版快很多。
 *
 * 兩種座標:
 *  - 地圖像素 (mapSpace): 跟著縮放變大變小, 車身、區域、標註這些「實際大小」的東西用這個
 *  - 螢幕像素 (screenSpace): 不跟著縮放, 文字標籤、細線用這個, 縮很小也看得清楚
 */
import { amrId2ColorRainbow } from "@/utils/utils";
import type { PaletteColors } from "@/theme";
import type { MapScene, SceneAnnotation } from "./scene";
import type { RouteHighlight } from "./routeHighlight";
import type { LiveState } from "./liveStore";
import { MapView, visibleRect } from "./view";

type Ctx = CanvasRenderingContext2D;

export type Frame = {
  ctx: Ctx;
  view: MapView;
  width: number;
  height: number;
  dpr: number;
  colors: PaletteColors;
  /** 底圖是深色 (深色主題配「跟著主題」), 顏色寫死的圖元要補淺色外框 */
  darkCanvas: boolean;
};

const FONT = `"Roboto", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;

const mapSpace = (f: Frame) => {
  const { dpr, view } = f;
  f.ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y);
};

const screenSpace = (f: Frame) => {
  f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
};

const toScreen = (f: Frame, x: number, y: number): [number, number] => [
  f.view.x + x * f.view.scale,
  f.view.y + y * f.view.scale,
];

/** 地圖像素大小換成螢幕像素, 再夾在 [min, max] 之間 */
const sized = (f: Frame, mapPx: number, min: number, max: number) =>
  Math.min(max, Math.max(min, mapPx * f.view.scale));

const colorCache = new Map<string, string>();
export const amrColor = (amrId: string) => {
  let c = colorCache.get(amrId);
  if (!c) {
    c = amrId2ColorRainbow(amrId);
    colorCache.set(amrId, c);
  }
  return c;
};

const toOpaque = (color: string) => {
  const rgb = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (!rgb) return color;
  const [, r, g, b] = rgb;
  return `rgb(${r}, ${g}, ${b})`;
};

/** 地圖上的字: 深色底圖用淺色字, 淺色底圖用深色字 (舊地圖的 FrameName 也是這樣補的) */
const mapTextColor = (f: Frame) => (f.darkCanvas ? f.colors.text : "#1c1c1c");

const roundRect = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

// ---------------------------------------------------------------- 底層 (設備圖層下面)

export type BaseOptions = {
  showRoad: boolean;
  showLocation: boolean;
  showZones: boolean;
  showAnnotation: boolean;
  claimedRoads: Map<string, string>;
  /** 游標正指著的點位 / 路線 (變紅、變大) */
  hoveredPointId: string | null;
  hoveredRoadId: string | null;
  /** 游標附近 (2 公尺內) 的點位, 稍微放大方便點 */
  nearbyPointIds: Set<string>;
  /** 按了眼睛圖示藏起來的區域 */
  hiddenZoneIds: Set<string>;
  /** MiR 類型點位的圖示, 還沒載入的先不畫 */
  mirIcon: (areaType: string) => HTMLImageElement | null;
};

export function drawBase(f: Frame, scene: MapScene, o: BaseOptions) {
  const { ctx } = f;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const vis = visibleRect(f.view, f.width, f.height, 60);

  // 順序同舊地圖的 DOM 順序: 標註在最底, 再來路線、區域, 點位最上面
  if (o.showAnnotation) drawAnnotations(f, scene.annotations);
  if (o.showRoad) drawRoads(f, scene, o.claimedRoads, vis, o.hoveredRoadId);
  if (o.showZones) drawZones(f, scene, o.hiddenZoneIds);
  if (o.showLocation) drawPoints(f, scene, vis, o);
}

type Rect = ReturnType<typeof visibleRect>;

const segmentVisible = (r: Rect, x1: number, y1: number, x2: number, y2: number) =>
  !(Math.max(x1, x2) < r.minX || Math.min(x1, x2) > r.maxX || Math.max(y1, y2) < r.minY || Math.min(y1, y2) > r.maxY);

/** 路線的線寬 (螢幕像素): 舊地圖是 1px 高、上下各 0.5px 框線的 div (約 2 地圖像素) */
export const roadLineWidth = (f: Pick<Frame, "view">) => Math.min(4, Math.max(1, 2 * f.view.scale));

function drawRoads(f: Frame, scene: MapScene, claimed: Map<string, string>, vis: Rect, hoveredId: string | null) {
  const { ctx, colors } = f;
  screenSpace(f);
  const lineWidth = roadLineWidth(f);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";
  ctx.globalAlpha = 0.7;

  // 同顏色的路線合成一條 path 一次畫完
  const groups = new Map<string, Path2D>();
  const add = (color: string, x1: number, y1: number, x2: number, y2: number) => {
    let p = groups.get(color);
    if (!p) {
      p = new Path2D();
      groups.set(color, p);
    }
    p.moveTo(x1, y1);
    p.lineTo(x2, y2);
  };

  const arrows = new Path2D();
  const arrowSize = sized(f, 5, 3, 9);
  const marks: { text: string; x: number; y: number }[] = [];
  let hovered: [number, number, number, number] | null = null;

  for (const r of scene.roads) {
    if (!segmentVisible(vis, r.x1, r.y1, r.x2, r.y2)) continue;
    const [ax, ay] = toScreen(f, r.x1, r.y1);
    const [bx, by] = toScreen(f, r.x2, r.y2);
    if (r.id === hoveredId) hovered = [ax, ay, bx, by];
    const claimedBy = claimed.get(r.id);
    const color = claimedBy
      ? amrColor(claimedBy)
      : r.priority === 1
        ? colors.mapRoadPriority
        : colors.mapRoad;
    add(color, ax, ay, bx, by);

    const len = Math.hypot(bx - ax, by - ay);
    if (r.oneWay && len > arrowSize * 3) {
      // 路線中間一個 > 形箭頭, 指向行進方向
      const angle = Math.atan2(by - ay, bx - ax);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const a = arrowSize * 0.7;
      arrows.moveTo(mx - a * cos + a * sin, my - a * sin - a * cos);
      arrows.lineTo(mx, my);
      arrows.lineTo(mx - a * cos - a * sin, my - a * sin + a * cos);
    }
    if ((r.disabled || r.limit) && len > 12) {
      const t = 0.23;
      marks.push({ text: r.disabled ? "⛔" : "❶", x: ax + (bx - ax) * t, y: ay + (by - ay) * t });
      if (r.disabled && r.limit) {
        marks.push({ text: "❶", x: ax + (bx - ax) * 0.4, y: ay + (by - ay) * 0.4 });
      }
    }
  }

  groups.forEach((path, color) => {
    if (f.darkCanvas) {
      // 被車佔用的路線是車的代表色, 有深有淺, 深色底圖上補一點淺色光暈
      ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
      ctx.shadowBlur = 2;
    }
    ctx.strokeStyle = color;
    ctx.stroke(path);
    ctx.shadowBlur = 0;
  });

  ctx.globalAlpha = 1;
  if (hovered) {
    // 游標指著的路線加粗 (舊地圖 hover 時是優先路線的顏色)
    const [ax, ay, bx, by] = hovered;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineWidth = lineWidth + 2;
    ctx.strokeStyle = colors.mapRoadPriority;
    ctx.stroke();
  }
  ctx.strokeStyle = colors.mapRoadArrow;
  ctx.lineWidth = Math.max(1.2, arrowSize * 0.4);
  ctx.lineJoin = "miter";
  ctx.stroke(arrows);

  if (marks.length) {
    const size = sized(f, 10, 8, 14);
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = f.darkCanvas ? "#ffffff" : "#1c1c1c";
    for (const m of marks) ctx.fillText(m.text, m.x, m.y - size * 0.6);
  }
}

/** 區域只畫框; 名稱、眼睛圖示、資訊卡是 DOM (CanvasMap 的 ZoneLabels), 才點得到。3D 檢視也拿來畫地上的區域 */
export function drawZones(f: Frame, scene: MapScene, hidden: Set<string>) {
  const { ctx } = f;
  mapSpace(f);
  for (const z of scene.zones) {
    if (hidden.has(z.id)) continue;
    // 框線 2 地圖像素, 縮小時至少 1 螢幕像素
    const border = Math.max(2, 1 / f.view.scale);
    if (z.disabled) {
      // 停用的區域: 灰色斜線 + 虛線框
      ctx.save();
      ctx.beginPath();
      ctx.rect(z.x, z.y, z.w, z.h);
      ctx.clip();
      ctx.strokeStyle = "rgba(128, 128, 128, 0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let d = -z.h; d < z.w; d += 10) {
        ctx.moveTo(z.x + d, z.y + z.h);
        ctx.lineTo(z.x + d + z.h, z.y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "rgba(128, 128, 128, 0.9)";
    } else {
      ctx.fillStyle = z.color;
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = toOpaque(z.color);
    }
    ctx.lineWidth = border;
    ctx.strokeRect(z.x + border / 2, z.y + border / 2, Math.max(0, z.w - border), Math.max(0, z.h - border));
    ctx.setLineDash([]);
  }
}

/** 點位圓點的半徑 (螢幕像素): 舊地圖是 3 地圖像素; 縮小時不讓它小到看不見, 放大時也不要變成大餅 */
export const pointRadius = (f: Pick<Frame, "view">) => Math.min(5, Math.max(1.5, 1.5 * f.view.scale));

function drawPoints(f: Frame, scene: MapScene, vis: Rect, o: BaseOptions) {
  const { ctx, colors } = f;
  screenSpace(f);
  const r0 = pointRadius(f);
  let hovered: { x: number; y: number } | null = null;
  const plain = new Path2D();
  const rotate = new Path2D();
  const ringPlain = new Path2D();
  const ringRotate = new Path2D();
  const ring = sized(f, 2.5, 2, 6);
  const mirSize = 22 * f.view.scale;

  for (const p of scene.points) {
    if (p.x < vis.minX || p.x > vis.maxX || p.y < vis.minY || p.y > vis.maxY) continue;
    const [sx, sy] = toScreen(f, p.x, p.y);
    if (p.mir) {
      const img = o.mirIcon(p.areaType);
      if (!img) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((-p.rotate * Math.PI) / 180);
      const size = p.id === o.hoveredPointId ? mirSize * 1.2 : mirSize;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
      continue;
    }
    if (p.id === o.hoveredPointId) hovered = { x: sx, y: sy };
    // 游標附近的點稍微放大 (舊地圖 3px -> 5px)
    const r = o.nearbyPointIds.has(p.id) ? r0 * 1.6 : r0;
    const ringR = r + ring;
    const path = p.canRotate ? rotate : plain;
    path.moveTo(sx + r, sy);
    path.arc(sx, sy, r, 0, Math.PI * 2);
    if (p.standby) {
      // 待命區外面多一圈
      const ring = p.canRotate ? ringRotate : ringPlain;
      ring.moveTo(sx + ringR, sy);
      ring.arc(sx, sy, ringR, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = colors.mapPoint;
  ctx.fill(plain);
  ctx.fillStyle = colors.mapPointRotate;
  ctx.fill(rotate);
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.mapPoint;
  ctx.stroke(ringPlain);
  ctx.strokeStyle = colors.mapPointRotate;
  ctx.stroke(ringRotate);
  if (hovered) {
    // 游標指著的點變紅變大
    ctx.beginPath();
    ctx.arc(hovered.x, hovered.y, Math.max(4, r0 * 2.6), 0, Math.PI * 2);
    ctx.fillStyle = "#ff0000";
    ctx.fill();
  }
}

function annotationLines(c: Ctx, a: SceneAnnotation) {
  c.font = `${a.fontSize}px ${FONT}`;
  const lines = a.text.split("\n");
  const lineH = a.fontSize * 1.25;
  const padX = a.backgroundColor ? a.fontSize * 0.4 : 0;
  const padY = a.backgroundColor ? a.fontSize * 0.1 : 0;
  const w = Math.max(...lines.map((l) => c.measureText(l).width)) + padX * 2;
  const h = lines.length * lineH + padY * 2;
  return { lines, lineH, padX, padY, w, h };
}

function drawAnnotationText(f: Frame, a: SceneAnnotation, x: number, y: number) {
  const { ctx } = f;
  if (!a.text) return;
  const m = annotationLines(ctx, a);
  if (a.backgroundColor) {
    ctx.fillStyle = a.backgroundColor;
    roundRect(ctx, x, y, m.w, m.h, 2);
    ctx.fill();
  }
  ctx.fillStyle = a.color || mapTextColor(f);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  m.lines.forEach((line, i) => {
    ctx.fillText(line, x + m.padX, y + m.padY + m.lineH * (i + 0.5));
  });
}

/** 3D 檢視也拿來畫地上的標註 */
export function drawAnnotations(f: Frame, list: SceneAnnotation[]) {
  const { ctx } = f;
  for (const a of list) {
    mapSpace(f);
    if (a.kind === "text") {
      // (x, y) 是沒轉之前的左上角, 繞文字中心轉
      if (a.rotation) {
        const m = annotationLines(ctx, a);
        ctx.translate(a.x + m.w / 2, a.y + m.h / 2);
        ctx.rotate((a.rotation * Math.PI) / 180);
        ctx.translate(-m.w / 2, -m.h / 2);
        drawAnnotationText(f, a, 0, 0);
      } else {
        drawAnnotationText(f, a, a.x, a.y);
      }
      continue;
    }
    const x = Math.min(a.x, a.x2 ?? a.x);
    const y = Math.min(a.y, a.y2 ?? a.y);
    const w = Math.abs((a.x2 ?? a.x) - a.x);
    const h = Math.abs((a.y2 ?? a.y) - a.y);
    if (a.fillColor) {
      ctx.fillStyle = a.fillColor;
      ctx.fillRect(x, y, w, h);
    }
    if (a.borderColor && a.borderWidth > 0) {
      const b = a.borderWidth;
      ctx.lineWidth = b;
      ctx.strokeStyle = a.borderColor;
      ctx.strokeRect(x + b / 2, y + b / 2, Math.max(0, w - b), Math.max(0, h - b));
    }
    drawAnnotationText(f, a, x + a.borderWidth, y + a.borderWidth);
  }
}

// ---------------------------------------------------------------- 上層 (車、點雲)

export type LiveOptions = {
  /** 地圖上要畫的車 (跟舊地圖一樣: 模擬模式只畫模擬車, 否則只畫實車) */
  amrIds: string[];
  showPointCloud: boolean;
  currentMapId: string | null;
  /** 車卡片點選 / 地圖點選的車; 有選的時候其他車變淡 */
  filterIds: Set<string>;
  hintId: string;
  /** 被區域禁止的車 */
  forbiddenIds: Set<string>;
  /** MiR 圖示長度 (地圖像素), 照車型實際長度 */
  mirLength: (amrId: string) => number;
  /** 動畫用的時間 (ms, performance.now()); 沒給就畫成靜止的 (例如使用者關了動態效果) */
  now?: number;
  /** 車輛卡片 hover「起點 → 終點」時要標出來的點位 */
  routeHighlight?: RouteHighlight | null;
};

type Visible = { id: string; x: number; y: number; yaw: number; color: string };

/**
 * 畫出來的車在地圖上佔的範圍 (地圖像素), 點選用:
 * 以 (x, y) 為原點、轉 angle 弧度之後, 車身是 [left, right] x [top, bottom]
 */
export type AmrHit = {
  id: string;
  x: number;
  y: number;
  angle: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  isPause: boolean;
  /** 跟舊地圖一樣只有堆高機點得到 (點了切換車卡片的選取) */
  clickable: boolean;
};

/**
 * 這台車要不要畫、畫在哪 (ROS 座標, 公尺; 3D 檢視也照這個規則): 離線、還沒收到車框、
 * MiR 不在目前這張地圖上就不畫。yaw 是度。
 * SW15 跟叉車一樣, 回報的就是地圖座標, 不另外轉。
 */
export const amrShownAt = (live: LiveState, id: string, currentMapId: string | null) => {
  const a = live.amrs.get(id);
  if (!a || !a.pose || a.isOverdue) return null;
  // 舊地圖收到車框之前不畫車
  const bbox = live.bbox.get(id);
  if (!bbox || !bbox.length) return null;
  if (id.includes("mi") && (live.mirMapId.get(id) ?? "") !== currentMapId) return null;
  const { x, y, yaw } = a.pose;
  return { x, y, yaw };
};

/**
 * hits: 車子在地圖上佔的範圍 (點選用);
 * animating: 畫面上有會動的東西 (目的地記號的微光), 外面要再排下一幀
 */
export function drawLive(
  f: Frame,
  scene: MapScene,
  live: LiveState,
  o: LiveOptions,
): { hits: AmrHit[]; animating: boolean } {
  const { ctx } = f;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const shown: Visible[] = [];
  for (const id of o.amrIds) {
    const at = amrShownAt(live, id, o.currentMapId);
    if (!at) continue;
    const [px, py] = scene.toPx(at.x, at.y);
    shown.push({ id, x: px, y: py, yaw: at.yaw, color: amrColor(id) });
  }

  if (o.showPointCloud) drawPointClouds(f, scene, live, o);
  const animating = drawDestinations(f, scene, live, shown, o) && o.now !== undefined;
  for (const v of shown) {
    if (!v.id.includes("mi")) drawBBox(f, scene, live.bbox.get(v.id)!, v.color);
  }

  const dimOthers = o.filterIds.size > 0 || o.forbiddenIds.size > 0;
  const hits: AmrHit[] = [];
  for (const v of shown) {
    const highlighted = o.filterIds.size ? o.filterIds.has(v.id) : o.forbiddenIds.has(v.id);
    ctx.globalAlpha = dimOthers && !highlighted ? 0.1 : 1;
    const a = live.amrs.get(v.id)!;
    if (v.id.includes("mi")) {
      const length = o.mirLength(v.id);
      drawMiR(f, v, a.hasCargo, length);
      const angle = ((90 - v.yaw) * Math.PI) / 180;
      hits.push({ id: v.id, x: v.x, y: v.y, angle, left: -7.5, right: 7.5, top: -length / 2, bottom: length / 2, isPause: false, clickable: false });
    } else {
      drawForklift(f, v, a.hasCargo, a.isPause);
      const deg = 90 - v.yaw;
      hits.push({ id: v.id, x: v.x, y: v.y, angle: (deg * Math.PI) / 180, left: -7.5, right: 7.5, top: -20, bottom: 0, isPause: a.isPause, clickable: true });
    }
    ctx.globalAlpha = 1;
  }

  for (const v of shown) {
    if (live.warnings.has(v.id)) drawWarning(f, v);
  }
  drawWaits(f, shown, live);
  const fading = drawRouteHighlight(f, scene, o);
  for (const v of shown) drawTip(f, v, o);
  return { hits, animating: animating || fading };
}

/** "rgb(r, g, b)" -> "rgba(r, g, b, a)" (toOpaque 出來的格式) */
const withAlpha = (rgb: string, alpha: number) =>
  rgb.replace(/^rgb\((.*)\)$/, `rgba($1, ${alpha})`);

/** 目的地圈外的微光: 一次多久 (ms)、往外飄幾個螢幕像素 */
const DEST_PULSE_MS = 2400;
const DEST_PULSE_SPREAD = 4;

/**
 * 循軌車 (非 MiR) 移動任務期間, 在它這一動要去的地點畫一個小記號: 車子顏色的空心細圈,
 * 圈外有一道很淡的細光環慢慢往外飄幾個像素就消失。
 * 圈比點位大一點、中間空心, 不會蓋住點位本身; 大小固定, 放大縮小都一樣小。
 * 車已經在目的地上 (例如正在取放貨) 就不畫。選到 / hover 卡片的那台再拉一條淡淡的虛線過去。
 * 回傳有沒有畫任何記號 (有的話外面要繼續排動畫)。
 */
function drawDestinations(f: Frame, scene: MapScene, live: LiveState, shown: Visible[], o: LiveOptions) {
  const { ctx } = f;
  const dimOthers = o.filterIds.size > 0 || o.forbiddenIds.size > 0;
  let drew = false;
  screenSpace(f);
  ctx.save();
  for (const v of shown) {
    if (v.id.includes("mi")) continue;
    const d = live.amrs.get(v.id)?.destination;
    const targetId = [d?.locationId, d?.finalLocationId]
      .map((x) => x?.trim() ?? "")
      .find((x) => x && x !== "0");
    if (!targetId) continue;
    const at = scene.locationPx.get(targetId);
    if (!at) continue;
    const [tx, ty] = toScreen(f, at[0], at[1]);
    const [cx, cy] = toScreen(f, v.x, v.y);
    // 車已經到了 (12 螢幕像素內) 就不用標
    if (Math.hypot(tx - cx, ty - cy) < 12) continue;
    // 不在畫面裡就不畫 (也不用為它跑動畫)
    if (tx < -40 || ty < -40 || tx > f.width + 40 || ty > f.height + 40) continue;
    drew = true;

    const focused = o.filterIds.has(v.id) || o.hintId === v.id;
    const highlighted = o.filterIds.size ? o.filterIds.has(v.id) : o.forbiddenIds.has(v.id);
    const alpha = dimOthers && !highlighted ? 0.15 : focused ? 1 : 0.85;
    const color = toOpaque(v.color);
    const r = 5;

    if (focused) {
      ctx.globalAlpha = alpha * 0.6;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = alpha;

    // 圈外一道很淡的細光環, 慢慢往外飄幾個像素就消失
    if (o.now !== undefined) {
      const t = (o.now % DEST_PULSE_MS) / DEST_PULSE_MS;
      const rr = r + 1.5 + t * DEST_PULSE_SPREAD;
      ctx.lineWidth = 1.2 * (1 - t) + 0.4;
      ctx.strokeStyle = withAlpha(color, 0.35 * (1 - t));
      ctx.beginPath();
      ctx.arc(tx, ty, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 空心細圈 (外面一圈白邊, 深色底圖上也看得到)
    ctx.lineWidth = 2.75;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  return drew;
}

/** hover 起點 / 終點時標記淡入多久 (ms) */
const ROUTE_FADE_MS = 180;

/**
 * 車輛卡片 hover「起點 → 終點」時, 把那幾個點位標出來:
 * 一圈很淡的車色光暈 + 細圈 (白邊), 上方一個小膠囊標籤寫「起點 101」「終點 205」。
 * 終點的標籤是實心車色、起點 / 前往是白底車色字, 一眼分得出來; 淡入、圈稍微放大一點點, 不會突然跳出來。
 * 兩個標籤疊在一起時, 後面那個改放到點位下方。回傳是不是還在淡入 (要繼續排動畫)。
 */
function drawRouteHighlight(f: Frame, scene: MapScene, o: LiveOptions) {
  const hl = o.routeHighlight;
  if (!hl || !hl.points.length) return false;
  const { ctx } = f;
  const elapsed = o.now === undefined ? ROUTE_FADE_MS : o.now - hl.since;
  const t = Math.min(1, Math.max(0, elapsed / ROUTE_FADE_MS));
  const k = 1 - (1 - t) * (1 - t);
  const color = toOpaque(amrColor(hl.amrId));
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const overlaps = (r: { x: number; y: number; w: number; h: number }) =>
    placed.some((p) => r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y);

  screenSpace(f);
  ctx.save();
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of hl.points) {
    const at = scene.locationPx.get(p.locationId);
    if (!at) continue;
    const [x, y] = toScreen(f, at[0], at[1]);
    const soft = p.kind === "next" ? 0.75 : 1;

    // 很淡的光暈
    ctx.globalAlpha = k * soft;
    ctx.fillStyle = withAlpha(color, 0.16);
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    // 細圈: 淡入時從 4px 長到 6px
    const r = 4 + 2 * k;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // 膠囊標籤 (上方; 跟別的標籤疊到就放下方), 淡入時往上滑 3px
    const w = ctx.measureText(p.label).width + 14;
    const h = 18;
    let rect = { x: x - w / 2, y: y - 14 - h + (1 - k) * 3, w, h };
    if (overlaps(rect)) rect = { ...rect, y: y + 14 };
    placed.push(rect);
    const solid = p.kind === "end";
    ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = solid ? color : "rgba(255, 255, 255, 0.96)";
    roundRect(ctx, rect.x, rect.y, w, h, h / 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (!solid) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = withAlpha(color, 0.6);
      roundRect(ctx, rect.x + 0.5, rect.y + 0.5, w - 1, h - 1, (h - 1) / 2);
      ctx.stroke();
    }
    ctx.fillStyle = solid ? "#fff" : color;
    ctx.fillText(p.label, x, rect.y + h / 2 + 0.5);
  }
  ctx.restore();
  return o.now !== undefined && t < 1;
}

/** 等待箭頭的顏色 (3D 也用這個) */
export const WAIT_COLOR = "#fa8c16";

/** 在等的車拉一條虛線箭頭到擋路的車 (交管拒絕路權, traffic-waits); 兩台都畫在地圖上才畫 */
function drawWaits(f: Frame, shown: Visible[], live: LiveState) {
  if (!live.waits.size) return;
  const { ctx } = f;
  const at = new Map(shown.map((v) => [v.id, v]));
  screenSpace(f);
  ctx.save();
  ctx.strokeStyle = WAIT_COLOR;
  ctx.fillStyle = WAIT_COLOR;
  ctx.lineWidth = 2;
  for (const w of live.waits.values()) {
    const from = at.get(w.amrId);
    if (!from) continue;
    const [ax, ay] = toScreen(f, from.x, from.y);
    for (const id of w.blockers) {
      const to = at.get(id);
      if (!to) continue;
      const [bx, by] = toScreen(f, to.x, to.y);
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 24) continue;
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      // 停在擋路的車前面一點, 箭頭才不會蓋在車上
      const ex = bx - ux * 14;
      const ey = by - uy * 14;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ex + ux * 9, ey + uy * 9);
      ctx.lineTo(ex - uy * 5, ey + ux * 5);
      ctx.lineTo(ex + uy * 5, ey - ux * 5);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPointClouds(f: Frame, scene: MapScene, live: LiveState, o: LiveOptions) {
  const { ctx } = f;
  mapSpace(f);
  const [ox, oy] = scene.toPx(0, 0);
  const inv = 1 / scene.resolution;
  // 縮很小時一個點至少 1.5 螢幕像素
  const size = Math.max(2, 1.5 / f.view.scale);
  for (const id of o.amrIds) {
    const pts = live.pointCloud.get(id);
    const a = live.amrs.get(id);
    if (!pts || !pts.length || !a || a.isOverdue) continue;
    const mirMap = live.mirMapId.get(id);
    if (mirMap !== undefined && mirMap !== o.currentMapId) continue;
    const path = new Path2D();
    for (let i = 0; i < pts.length; i += 2) {
      path.rect(ox + pts[i] * inv - size / 2, oy - pts[i + 1] * inv - size / 2, size, size);
    }
    ctx.fillStyle = amrColor(id);
    ctx.fill(path);
  }
}

function drawBBox(f: Frame, scene: MapScene, bbox: number[][], color: string) {
  const { ctx } = f;
  screenSpace(f);
  const n = bbox.length - 1; // 最後一個是中心點
  if (n < 2) return;
  const [cx, cy] = toScreen(f, ...scene.toPx(bbox[n][0], bbox[n][1]));
  const path = new Path2D();
  for (let i = 0; i < n; i += 1) {
    const cur = bbox[i];
    const next = bbox[(i + 1) % n];
    const [ax, ay] = toScreen(f, ...scene.toPx(cur[0], cur[1]));
    const [bx, by] = toScreen(f, ...scene.toPx(next[0], next[1]));
    path.moveTo(ax, ay);
    path.lineTo(bx, by);
    path.moveTo(ax, ay);
    path.lineTo(cx, cy);
  }
  ctx.globalAlpha = 0.63;
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  if (f.darkCanvas) {
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.shadowBlur = 1;
  }
  ctx.strokeStyle = color;
  ctx.stroke(path);
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** 堆高機: 15x20 車身, 旋轉中心在叉臂根部 (= 車的位置), 叉臂往後伸 */
function drawForklift(f: Frame, v: Visible, hasCargo: boolean, isPause: boolean) {
  const { ctx } = f;
  const alpha = ctx.globalAlpha;
  mapSpace(f);
  ctx.translate(v.x, v.y);
  const deg = 90 - v.yaw;
  ctx.rotate((deg * Math.PI) / 180);

  // 叉臂
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = f.darkCanvas ? "#d9d9d9" : "#333333";
  ctx.fillRect(-4.5, -1, 3, 12);
  ctx.fillRect(1.5, -1, 3, 12);

  // 車身
  ctx.globalAlpha = alpha * 0.8;
  roundRect(ctx, -7.5, -20, 15, 20, 3);
  ctx.fillStyle = v.color;
  ctx.fill();
  if (f.darkCanvas) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.stroke();
  }

  if (hasCargo) {
    ctx.fillStyle = "#ff7875";
    ctx.fillRect(-8.5, 5, 15, 10);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(-8.5, 5, 15, 10);
  }
  ctx.globalAlpha = alpha;

  if (isPause) {
    // 紅色八角形停止標誌, 蓋在車身中間
    ctx.translate(0, -10);
    ctx.rotate((-deg * Math.PI) / 180);
    const s = 15;
    const k = s * 0.4;
    ctx.beginPath();
    ctx.moveTo(-k, -s);
    ctx.lineTo(k, -s);
    ctx.lineTo(s, -k);
    ctx.lineTo(s, k);
    ctx.lineTo(k, s);
    ctx.lineTo(-k, s);
    ctx.lineTo(-s, k);
    ctx.lineTo(-s, -k);
    ctx.closePath();
    ctx.fillStyle = "#ff4d50";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = "#ff4d4f";
    ctx.fillRect(-1, -5, 2, 10);
  }
}

/** MiR: 寬 15, 長度照車型, 中心在車的位置, 車頭有白色箭頭 */
function drawMiR(f: Frame, v: Visible, hasCargo: boolean, length: number) {
  const { ctx } = f;
  const alpha = ctx.globalAlpha;
  mapSpace(f);
  ctx.translate(v.x, v.y);
  ctx.rotate(((90 - v.yaw) * Math.PI) / 180);
  const w = 15;
  const h = length;
  ctx.globalAlpha = alpha * 0.8;
  roundRect(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fillStyle = v.color;
  ctx.fill();
  if (f.darkCanvas) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.stroke();
  }
  if (hasCargo) {
    ctx.globalAlpha = alpha * 0.6;
    roundRect(ctx, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 2);
    ctx.fillStyle = "#ff7875";
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  // 車頭的 ^ 箭頭
  ctx.beginPath();
  const top = -h / 2 + 1;
  ctx.moveTo(0, top);
  ctx.lineTo(4.5, top + 1.8);
  ctx.lineTo(4.5, top + 3);
  ctx.lineTo(0, top + 1.2);
  ctx.lineTo(-4.5, top + 3);
  ctx.lineTo(-4.5, top + 1.8);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function drawWarning(f: Frame, v: Visible) {
  const { ctx } = f;
  screenSpace(f);
  const [sx, sy] = toScreen(f, v.x, v.y);
  const size = 16;
  const x = sx + sized(f, 10, 6, 40);
  const y = sy - sized(f, 22, 12, 120);
  ctx.fillStyle = "rgba(252, 252, 252, 0.75)";
  ctx.fillRect(x - 2, y - size, size + 4, size + 4);
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("❗", x, y + 2);
}

/** 車上方的黑色提示框: 車號 (選取 / 卡片 hover / 區域禁行時); 在做什麼、要去哪裡改放在車輛卡片 */
function drawTip(f: Frame, v: Visible, o: LiveOptions) {
  const forbidden = o.forbiddenIds.has(v.id);
  const show = o.filterIds.has(v.id) || o.hintId === v.id || forbidden;
  if (!show) return;

  const { ctx } = f;
  screenSpace(f);
  const lines: { text: string; bold: boolean }[] = [
    { text: `${forbidden ? "🚫 " : ""}${v.id}`, bold: true },
  ];

  const fontSize = 11;
  const lineH = 14;
  let w = 0;
  for (const l of lines) {
    ctx.font = `${l.bold ? "bold " : ""}${fontSize}px ${FONT}`;
    w = Math.max(w, ctx.measureText(l.text).width);
  }
  w += 12;
  const h = lines.length * lineH + 4;
  const [sx, sy] = toScreen(f, v.x, v.y);
  // 堆高機車身在車的位置上方 20 地圖像素, 框要讓開車身
  const gap = (v.id.includes("mi") ? 12 : 24) * f.view.scale + 8;
  const bottom = sy - gap;
  const left = sx - w / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  roundRect(ctx, left, bottom - h, w, h, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 6, bottom);
  ctx.lineTo(sx + 6, bottom);
  ctx.lineTo(sx, bottom + 6);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => {
    ctx.font = `${l.bold ? "bold " : ""}${fontSize}px ${FONT}`;
    ctx.fillStyle = l.bold ? "#fafafa" : "rgba(250, 250, 250, 0.85)";
    ctx.fillText(l.text, sx, bottom - h + 2 + lineH * (i + 0.5));
  });
}
