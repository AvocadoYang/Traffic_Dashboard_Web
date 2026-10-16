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
  disabledZoneLabel: string;
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
  if (o.showRoad) drawRoads(f, scene, o.claimedRoads, vis);
  if (o.showZones) drawZones(f, scene, o.disabledZoneLabel);
  if (o.showLocation) drawPoints(f, scene, vis, o.mirIcon);
}

type Rect = ReturnType<typeof visibleRect>;

const segmentVisible = (r: Rect, x1: number, y1: number, x2: number, y2: number) =>
  !(Math.max(x1, x2) < r.minX || Math.min(x1, x2) > r.maxX || Math.max(y1, y2) < r.minY || Math.min(y1, y2) > r.maxY);

function drawRoads(f: Frame, scene: MapScene, claimed: Map<string, string>, vis: Rect) {
  const { ctx, colors } = f;
  screenSpace(f);
  // 舊地圖的路線是 1px 高、上下各 0.5px 框線的 div (約 2 地圖像素), 透明度 0.7
  const lineWidth = sized(f, 2, 1, 4);
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

  for (const r of scene.roads) {
    if (!segmentVisible(vis, r.x1, r.y1, r.x2, r.y2)) continue;
    const [ax, ay] = toScreen(f, r.x1, r.y1);
    const [bx, by] = toScreen(f, r.x2, r.y2);
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

function drawZones(f: Frame, scene: MapScene, disabledLabel: string) {
  const { ctx } = f;
  for (const z of scene.zones) {
    mapSpace(f);
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

    // 名稱放在框的左上方, 字不跟著縮放
    screenSpace(f);
    const [sx, sy] = toScreen(f, z.x, z.y);
    ctx.font = `12px ${FONT}`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    let x = sx;
    if (z.disabled) {
      ctx.font = `bold 10px ${FONT}`;
      const w = ctx.measureText(disabledLabel).width + 10;
      ctx.fillStyle = "rgba(110, 110, 110, 0.95)";
      ctx.fillRect(x, sy - 18, w, 15);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(disabledLabel, x + 5, sy - 5);
      x += w + 4;
      ctx.font = `12px ${FONT}`;
    }
    ctx.globalAlpha = z.disabled ? 0.7 : 1;
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = f.darkCanvas ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";
    ctx.strokeText(z.name, x, sy - 4);
    ctx.fillStyle = mapTextColor(f);
    ctx.fillText(z.name, x, sy - 4);
    ctx.globalAlpha = 1;
  }
}

function drawPoints(f: Frame, scene: MapScene, vis: Rect, mirIcon: BaseOptions["mirIcon"]) {
  const { ctx, colors } = f;
  screenSpace(f);
  // 舊地圖是 3 地圖像素的小圓點; 縮小時不讓它小到看不見, 放大時也不要變成大餅
  const r = sized(f, 1.5, 1.5, 5);
  const plain = new Path2D();
  const rotate = new Path2D();
  const ringPlain = new Path2D();
  const ringRotate = new Path2D();
  const ringR = r + sized(f, 2.5, 2, 6);
  const mirSize = 22 * f.view.scale;

  for (const p of scene.points) {
    if (p.x < vis.minX || p.x > vis.maxX || p.y < vis.minY || p.y > vis.maxY) continue;
    const [sx, sy] = toScreen(f, p.x, p.y);
    if (p.mir) {
      const img = mirIcon(p.areaType);
      if (!img) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((-p.rotate * Math.PI) / 180);
      ctx.drawImage(img, -mirSize / 2, -mirSize / 2, mirSize, mirSize);
      ctx.restore();
      continue;
    }
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

function drawAnnotations(f: Frame, list: SceneAnnotation[]) {
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
};

type Visible = { id: string; x: number; y: number; yaw: number; color: string };

export function drawLive(f: Frame, scene: MapScene, live: LiveState, o: LiveOptions) {
  const { ctx } = f;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const shown: Visible[] = [];
  for (const id of o.amrIds) {
    const a = live.amrs.get(id);
    if (!a || !a.pose || a.isOverdue) continue;
    // 舊地圖收到車框之前不畫車
    const bbox = live.bbox.get(id);
    if (!bbox || !bbox.length) continue;
    if (id.includes("mi") && (live.mirMapId.get(id) ?? "") !== o.currentMapId) continue;
    // SW15 的座標要轉 270 度再位移 (照舊地圖 AMR.tsx)
    let { x, y } = a.pose;
    if (id.includes("SW15")) {
      const theta = (3 * Math.PI) / 2;
      const nx = a.pose.x * Math.cos(theta) - a.pose.y * Math.sin(theta) + 3.5;
      const ny = a.pose.x * Math.sin(theta) + a.pose.y * Math.cos(theta) + 0.4;
      x = nx;
      y = ny;
    }
    const [px, py] = scene.toPx(x, y);
    shown.push({ id, x: px, y: py, yaw: a.pose.yaw, color: amrColor(id) });
  }

  if (o.showPointCloud) drawPointClouds(f, scene, live, o);
  for (const v of shown) {
    if (!v.id.includes("mi")) drawBBox(f, scene, live.bbox.get(v.id)!, v.color);
  }

  const dimOthers = o.filterIds.size > 0 || o.forbiddenIds.size > 0;
  for (const v of shown) {
    const highlighted = o.filterIds.size ? o.filterIds.has(v.id) : o.forbiddenIds.has(v.id);
    ctx.globalAlpha = dimOthers && !highlighted ? 0.1 : 1;
    const a = live.amrs.get(v.id)!;
    if (v.id.includes("mi")) drawMiR(f, v, a.hasCargo, o.mirLength(v.id));
    else drawForklift(f, v, a.hasCargo, a.isPause);
    ctx.globalAlpha = 1;
  }

  for (const v of shown) {
    if (live.warnings.has(v.id)) drawWarning(f, v);
  }
  for (const v of shown) drawTip(f, v, live, o);
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
  const deg = v.id.includes("SW15") ? 90 - v.yaw + 180 : 90 - v.yaw;
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

const IDLE_STATUS = ["standby"];
const pickLoc = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed && trimmed !== "0" ? trimmed : "";
};

/** 車上方的黑色提示框: 車號、在做什麼、要去哪裡 (規則同 useAmrMissionTip) */
function drawTip(f: Frame, v: Visible, live: LiveState, o: LiveOptions) {
  const a = live.amrs.get(v.id)!;
  const status = a.status.trim();
  const isIdle = !status || IDLE_STATUS.includes(status.toLowerCase());
  const tipText = live.activeSubName.get(v.id) || (isIdle ? "" : status);
  const dest =
    pickLoc(a.destination?.name) ||
    pickLoc(a.destination?.finalLocationId) ||
    pickLoc(a.destination?.locationId);
  const forbidden = o.forbiddenIds.has(v.id);
  const show = o.filterIds.has(v.id) || o.hintId === v.id || forbidden || !!tipText || !!dest;
  if (!show) return;

  const { ctx } = f;
  screenSpace(f);
  const lines: { text: string; bold: boolean }[] = [
    { text: `${forbidden ? "🚫 " : ""}${v.id}`, bold: true },
  ];
  if (tipText) lines.push({ text: tipText, bold: false });
  if (dest) lines.push({ text: `→ ${dest}`, bold: false });

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
