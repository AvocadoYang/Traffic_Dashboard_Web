/**
 * DXF (文字格式) 讀取. 只讀 2D 平面圖用得到的部分: 檔頭的單位和編碼、圖層表、圖塊、
 * 模型空間的圖元. 圖元讀成很單純的資料 (還沒套圖塊的位移旋轉), flatten.ts 再轉成線.
 *
 * 不用現成套件: 客戶的圖常有幾個壞掉的圖元 (例如沒有頂點的聚合線), 這裡讀不懂的圖元
 * 直接跳過並記下來, 不會整個檔案讀不進來; 也一邊讀一邊丟, 大檔不會先切成幾百萬行的陣列.
 */

export interface DxfHeader {
  /** $INSUNITS; 沒寫是 null */
  insunits: number | null;
  /** $ACADVER, 例如 AC1015 (R2000)、AC1021 (R2007) */
  acadver: string;
  /** $DWGCODEPAGE, 例如 ANSI_950 (繁體中文 Big5) */
  codepage: string;
}

export interface DxfLayer {
  name: string;
  /** AutoCAD 顏色號碼 (1 ~ 255) */
  color: number;
  /** 關閉 (顏色號碼是負的) */
  off: boolean;
  frozen: boolean;
}

interface Base {
  layer: string;
  /**
   * 擠出方向的 z 是負的 (鏡射過的圖元常常這樣). 用物件座標系的圖元 (圓、弧、聚合線、文字、
   * 圖塊插入、實心、剖面線) 是 x 軸反過來; 橢圓是短軸反過來; 其他圖元本來就是世界座標, 一律 false.
   */
  flip: boolean;
}

export type DxfEntity = Base &
  (
    | { type: "LINE"; x1: number; y1: number; x2: number; y2: number }
    /** pts: x, y, bulge 一組三個; bulge 是到下一個頂點那一段的弧度 (tan(角度/4)) */
    | { type: "POLY"; pts: number[]; closed: boolean }
    /** 角度是度, 逆時針從 a0 到 a1 */
    | { type: "ARC"; cx: number; cy: number; r: number; a0: number; a1: number }
    | { type: "CIRCLE"; cx: number; cy: number; r: number }
    /** (mx, my): 長軸端點 (相對中心); t0 ~ t1 是參數 (弧度) */
    | { type: "ELLIPSE"; cx: number; cy: number; mx: number; my: number; ratio: number; t0: number; t1: number }
    | { type: "SPLINE"; degree: number; knots: number[]; ctrl: number[]; weights: number[]; fit: number[]; closed: boolean }
    /** ha: 0 左 1 中 2 右; va: 0 基線 1 底 2 中 3 上; rot 是度 */
    | { type: "TEXT"; x: number; y: number; h: number; rot: number; text: string; ha: number; va: number }
    | { type: "INSERT"; name: string; x: number; y: number; sx: number; sy: number; rot: number; cols: number; rows: number; dc: number; dr: number }
    /** 標註: 畫法存在一個匿名圖塊裡 */
    | { type: "DIMENSION"; block: string }
    /** 實心、3D 面: 依序的角點 */
    | { type: "SOLID"; pts: number[] }
    /** 剖面線只畫邊界; 每個邊界一串 x, y, bulge */
    | { type: "HATCH"; loops: number[][] }
  );

export interface DxfBlock {
  name: string;
  x: number;
  y: number;
  /** 外部參考: 內容不在這個檔案裡 */
  xref: boolean;
  entities: DxfEntity[];
}

export interface DxfData {
  header: DxfHeader;
  layers: Map<string, DxfLayer>;
  blocks: Map<string, DxfBlock>;
  entities: DxfEntity[];
  /** 跳過的圖元類型和數量 (讀不懂、不支援、壞掉的) */
  skipped: Record<string, number>;
}

export class DxfFormatError extends Error {}

/** 一次讀一組 (群組碼 + 值), 可以退回一組 */
class Scanner {
  private pos = 0;
  private back = false;
  code = -1;
  value = "";

  constructor(private readonly s: string) {}

  next(): boolean {
    if (this.back) {
      this.back = false;
      return true;
    }
    const s = this.s;
    if (this.pos >= s.length) {
      this.code = -1;
      this.value = "";
      return false;
    }
    let e = s.indexOf("\n", this.pos);
    if (e < 0) e = s.length;
    const code = parseInt(s.slice(this.pos, e), 10);
    this.pos = e + 1;
    e = s.indexOf("\n", this.pos);
    if (e < 0) e = s.length;
    let v = s.slice(this.pos, e);
    if (v.charCodeAt(v.length - 1) === 13) v = v.slice(0, -1);
    this.pos = e + 1;
    this.code = Number.isNaN(code) ? -2 : code;
    this.value = v;
    return true;
  }

  pushBack() {
    this.back = true;
  }

  get progress() {
    return this.s.length ? this.pos / this.s.length : 1;
  }

  /** 是不是 0 / name (例如 0 / ENDSEC) */
  is0(name: string) {
    return this.code === 0 && this.value.trim() === name;
  }
}

const toNum = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const toInt = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/** \U+4E2D 這種 (R2004 以前存非 ASCII 字的寫法) 和 %%c 這類控制碼換成真的字 */
export function decodeDxfString(s: string): string {
  if (s.indexOf("\\U+") >= 0) s = s.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  if (s.indexOf("%%") >= 0) {
    s = s
      .replace(/%%[cC]/g, "⌀")
      .replace(/%%[dD]/g, "°")
      .replace(/%%[pP]/g, "±")
      .replace(/%%[uUoOkK]/g, "")
      .replace(/%%%/g, "%")
      .replace(/%%(\d{3})/g, (_, d: string) => String.fromCharCode(Number(d)));
  }
  return s;
}

/** 多行文字的格式碼拿掉, 只留文字 (\P 換行) */
export function cleanMtext(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{" || ch === "}") continue;
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const k = s[i + 1];
    if (k === undefined) break;
    i++;
    switch (k) {
      case "P":
      case "n":
        out += "\n";
        break;
      case "~":
        out += " ";
        break;
      case "\\":
      case "{":
      case "}":
        out += k;
        break;
      case "L":
      case "l":
      case "O":
      case "o":
      case "K":
      case "k":
        break;
      case "S": {
        // 堆疊文字 \S1/2; -> 1/2
        const end = s.indexOf(";", i);
        if (end < 0) break;
        out += s.slice(i + 1, end).replace(/[#^]/g, "/");
        i = end;
        break;
      }
      case "U":
        if (s[i + 1] === "+" && /^[0-9A-Fa-f]{4}$/.test(s.slice(i + 2, i + 6))) {
          out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
          i += 5;
        }
        break;
      default: {
        // \f... \H... \C... \A... \p... 等等: 到分號為止
        const end = s.indexOf(";", i);
        if (end >= 0 && /^[fFhHcCtTqQwWaApX]$/.test(k)) i = end;
        break;
      }
    }
  }
  return decodeDxfString(out);
}

type Groups = { codes: number[]; values: string[] };

function readGroups(sc: Scanner): Groups {
  const codes: number[] = [];
  const values: string[] = [];
  while (sc.next()) {
    if (sc.code === 0) {
      sc.pushBack();
      break;
    }
    codes.push(sc.code);
    values.push(sc.value);
  }
  return { codes, values };
}

/** 第一個 code 的值 */
function first(g: Groups, code: number): string | undefined {
  const i = g.codes.indexOf(code);
  return i >= 0 ? g.values[i] : undefined;
}
const num = (g: Groups, code: number, fallback = 0) => {
  const v = first(g, code);
  return v === undefined ? fallback : toNum(v);
};
const int = (g: Groups, code: number, fallback = 0) => {
  const v = first(g, code);
  return v === undefined ? fallback : toInt(v);
};

/** 所有圖元共用: 圖層、在不在圖紙空間、看不看得到、擠出方向 */
function common(g: Groups) {
  return {
    layer: decodeDxfString((first(g, 8) ?? "0").trim()) || "0",
    paper: int(g, 67) === 1,
    invisible: int(g, 60) === 1,
    flip: num(g, 230, 1) < 0,
  };
}

function bump(skipped: Record<string, number>, type: string) {
  skipped[type] = (skipped[type] ?? 0) + 1;
}

function lwpolyline(g: Groups): number[] {
  const pts: number[] = [];
  for (let i = 0; i < g.codes.length; i++) {
    const c = g.codes[i];
    if (c === 10) pts.push(toNum(g.values[i]), 0, 0);
    else if (c === 20 && pts.length) pts[pts.length - 2] = toNum(g.values[i]);
    else if (c === 42 && pts.length) pts[pts.length - 1] = toNum(g.values[i]);
  }
  return pts;
}

function spline(g: Groups, base: Base): DxfEntity | null {
  const knots: number[] = [];
  const ctrl: number[] = [];
  const weights: number[] = [];
  const fit: number[] = [];
  for (let i = 0; i < g.codes.length; i++) {
    const c = g.codes[i];
    const v = toNum(g.values[i]);
    if (c === 40) knots.push(v);
    else if (c === 41) weights.push(v);
    else if (c === 10) ctrl.push(v, 0);
    else if (c === 20 && ctrl.length) ctrl[ctrl.length - 1] = v;
    else if (c === 11) fit.push(v, 0);
    else if (c === 21 && fit.length) fit[fit.length - 1] = v;
  }
  if (ctrl.length < 4 && fit.length < 4) return null;
  return { ...base, type: "SPLINE", degree: Math.max(1, int(g, 71, 3)), knots, ctrl, weights, fit, closed: (int(g, 70) & 1) === 1 };
}

/** 剖面線的邊界 (只拿形狀, 不管填什麼圖樣) */
function hatchLoops(g: Groups): number[][] | null {
  const start = g.codes.indexOf(91);
  if (start < 0) return null;
  let i = start;
  const n = toInt(g.values[i]);
  const loops: number[][] = [];
  const need = (code: number) => {
    i++;
    while (i < g.codes.length && g.codes[i] !== code) i++;
    if (i >= g.codes.length) throw new DxfFormatError("hatch");
    return toNum(g.values[i]);
  };
  const peek = () => g.codes[i + 1];
  try {
    for (let p = 0; p < n; p++) {
      const flags = need(92);
      const pts: number[] = [];
      if (flags & 2) {
        // 聚合線邊界
        const hasBulge = need(72) !== 0;
        need(73);
        const count = need(93);
        for (let k = 0; k < count; k++) {
          const x = need(10);
          const y = need(20);
          const b = hasBulge && peek() === 42 ? need(42) : 0;
          pts.push(x, y, b);
        }
      } else {
        const edges = need(93);
        for (let k = 0; k < edges; k++) {
          const type = need(72);
          if (type === 1) {
            const x1 = need(10);
            const y1 = need(20);
            const x2 = need(11);
            const y2 = need(21);
            if (!pts.length) pts.push(x1, y1, 0);
            pts.push(x2, y2, 0);
          } else if (type === 2) {
            const cx = need(10);
            const cy = need(20);
            const r = need(40);
            let a0 = need(50);
            let a1 = need(51);
            const ccw = need(73) !== 0;
            if (!ccw) {
              a0 = 360 - a0;
              a1 = 360 - a1;
            }
            const sweep = ccw ? (((a1 - a0) % 360) + 360) % 360 || 360 : -((((a0 - a1) % 360) + 360) % 360 || 360);
            const steps = Math.max(2, Math.ceil(Math.abs(sweep) / 7.5));
            for (let s = pts.length ? 1 : 0; s <= steps; s++) {
              const a = ((a0 + (sweep * s) / steps) * Math.PI) / 180;
              pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a), 0);
            }
          } else {
            // 橢圓弧、雲形線邊: 少見, 整個邊界不畫
            return loops.length ? loops : null;
          }
        }
      }
      if (pts.length >= 6) loops.push(pts);
      // 跳過關聯的物件 handle (97 + 330 x n)
    }
  } catch {
    return loops.length ? loops : null;
  }
  return loops;
}

/** 讀一個圖元 (目前 sc 停在 0 / 類型); POLYLINE 會一路讀到 SEQEND */
function readEntity(sc: Scanner, type: string, skipped: Record<string, number>, out: DxfEntity[]) {
  const g = readGroups(sc);
  const c = common(g);
  const base: Base = { layer: c.layer, flip: c.flip };
  const keep = !c.paper && !c.invisible;
  const push = (e: DxfEntity) => {
    if (keep) out.push(e);
  };

  switch (type) {
    case "LINE":
      push({ ...base, flip: false, type: "LINE", x1: num(g, 10), y1: num(g, 20), x2: num(g, 11), y2: num(g, 21) });
      return;
    case "LWPOLYLINE": {
      const pts = lwpolyline(g);
      if (pts.length >= 6) push({ ...base, type: "POLY", pts, closed: (int(g, 70) & 1) === 1 });
      else bump(skipped, "LWPOLYLINE (empty)");
      return;
    }
    case "POLYLINE": {
      const flags = int(g, 70);
      const pts: number[] = [];
      // 後面跟著 VERTEX ... SEQEND
      while (sc.next()) {
        if (sc.code !== 0) continue;
        const t = sc.value.trim();
        if (t !== "VERTEX") {
          if (t === "SEQEND") readGroups(sc);
          else sc.pushBack();
          break;
        }
        const v = readGroups(sc);
        const vf = int(v, 70);
        // 16: 雲形線的控制點 (要畫的是擬合出來的點), 128 + 64: 多面網格的面
        if (vf & 16 || (vf & 128 && !(vf & 64))) continue;
        pts.push(num(v, 10), num(v, 20), num(v, 42));
      }
      if (flags & (16 | 64)) {
        bump(skipped, "POLYLINE (mesh)");
        return;
      }
      // 8: 3D 聚合線, 座標是世界座標
      if (pts.length >= 6) push({ ...base, flip: base.flip && !(flags & 8), type: "POLY", pts, closed: (flags & 1) === 1 });
      else bump(skipped, "POLYLINE (empty)");
      return;
    }
    case "ARC":
      push({ ...base, type: "ARC", cx: num(g, 10), cy: num(g, 20), r: num(g, 40), a0: num(g, 50), a1: num(g, 51) });
      return;
    case "CIRCLE":
      push({ ...base, type: "CIRCLE", cx: num(g, 10), cy: num(g, 20), r: num(g, 40) });
      return;
    case "ELLIPSE":
      push({
        ...base,
        type: "ELLIPSE",
        cx: num(g, 10),
        cy: num(g, 20),
        mx: num(g, 11),
        my: num(g, 21),
        ratio: num(g, 40, 1),
        t0: num(g, 41, 0),
        t1: num(g, 42, Math.PI * 2),
      });
      return;
    case "SPLINE": {
      const e = spline(g, { ...base, flip: false });
      if (e) push(e);
      else bump(skipped, "SPLINE (empty)");
      return;
    }
    case "TEXT":
    case "ATTRIB": {
      // ATTRIB 的 70 & 1 = 不顯示
      if (type === "ATTRIB" && int(g, 70) & 1) return;
      const ha = int(g, 72);
      const va = int(g, 73);
      const aligned = (ha !== 0 || va !== 0) && first(g, 11) !== undefined && ha !== 3 && ha !== 5;
      const text = decodeDxfString(first(g, 1) ?? "");
      if (!text.trim()) return;
      push({
        ...base,
        type: "TEXT",
        x: aligned ? num(g, 11) : num(g, 10),
        y: aligned ? num(g, 21) : num(g, 20),
        h: num(g, 40, 1),
        rot: num(g, 50),
        text,
        ha: ha === 4 ? 1 : ha === 3 || ha === 5 ? 0 : Math.min(2, ha),
        va: ha === 4 ? 2 : Math.min(3, va),
      });
      return;
    }
    case "MTEXT": {
      let raw = "";
      for (let i = 0; i < g.codes.length; i++) if (g.codes[i] === 3) raw += g.values[i];
      raw += first(g, 1) ?? "";
      const text = cleanMtext(raw);
      if (!text.trim()) return;
      const att = Math.min(9, Math.max(1, int(g, 71, 1)));
      const dx = first(g, 11) !== undefined ? num(g, 11) : null;
      const dy = num(g, 21);
      const rot = dx !== null && (dx !== 0 || dy !== 0) ? (Math.atan2(dy, dx) * 180) / Math.PI : num(g, 50);
      push({
        ...base,
        flip: false,
        type: "TEXT",
        x: num(g, 10),
        y: num(g, 20),
        h: num(g, 40, 1),
        rot,
        text,
        ha: (att - 1) % 3,
        // 1~3 上, 4~6 中, 7~9 下
        va: att <= 3 ? 3 : att <= 6 ? 2 : 1,
      });
      return;
    }
    case "INSERT": {
      const name = decodeDxfString((first(g, 2) ?? "").trim());
      const e: DxfEntity = {
        ...base,
        type: "INSERT",
        name,
        x: num(g, 10),
        y: num(g, 20),
        sx: num(g, 41, 1) || 1,
        sy: num(g, 42, 1) || 1,
        rot: num(g, 50),
        cols: Math.max(1, int(g, 70, 1)),
        rows: Math.max(1, int(g, 71, 1)),
        dc: num(g, 44),
        dr: num(g, 45),
      };
      if (name) push(e);
      // 66 = 1: 後面跟著屬性 (ATTRIB) ... SEQEND, 屬性是文字, 位置已經是插入後的
      if (int(g, 66) === 1) {
        while (sc.next()) {
          if (sc.code !== 0) continue;
          const t = sc.value.trim();
          if (t === "ATTRIB") {
            readEntity(sc, "ATTRIB", skipped, keep ? out : []);
            continue;
          }
          if (t === "SEQEND") readGroups(sc);
          else sc.pushBack();
          break;
        }
      }
      return;
    }
    case "DIMENSION": {
      const block = decodeDxfString((first(g, 2) ?? "").trim());
      if (block) push({ ...base, flip: false, type: "DIMENSION", block });
      return;
    }
    case "SOLID":
    case "TRACE": {
      // 角點順序是 1 2 4 3 (Z 字形)
      const p = [num(g, 10), num(g, 20), num(g, 11), num(g, 21)];
      const has4 = first(g, 13) !== undefined;
      const p3 = [num(g, 12), num(g, 22)];
      const p4 = has4 ? [num(g, 13), num(g, 23)] : p3;
      push({ ...base, type: "SOLID", pts: [...p, ...p4, ...p3] });
      return;
    }
    case "3DFACE":
      push({ ...base, flip: false, type: "SOLID", pts: [num(g, 10), num(g, 20), num(g, 11), num(g, 21), num(g, 12), num(g, 22), num(g, 13), num(g, 23)] });
      return;
    case "LEADER": {
      const pts: number[] = [];
      for (let i = 0; i < g.codes.length; i++) {
        if (g.codes[i] === 10) pts.push(toNum(g.values[i]), 0, 0);
        else if (g.codes[i] === 20 && pts.length) pts[pts.length - 2] = toNum(g.values[i]);
      }
      if (pts.length >= 6) push({ ...base, flip: false, type: "POLY", pts, closed: false });
      return;
    }
    case "HATCH": {
      const loops = hatchLoops(g);
      if (loops?.length) push({ ...base, type: "HATCH", loops });
      else bump(skipped, "HATCH");
      return;
    }
    case "POINT":
    case "VIEWPORT":
    case "ATTDEF":
    case "SEQEND":
    case "VERTEX":
      return;
    default:
      if (keep) bump(skipped, type);
  }
}

function readEntities(sc: Scanner, until: string, skipped: Record<string, number>): DxfEntity[] {
  const out: DxfEntity[] = [];
  while (sc.next()) {
    if (sc.code !== 0) continue;
    const type = sc.value.trim();
    if (type === until || type === "ENDSEC" || type === "EOF") {
      sc.pushBack();
      break;
    }
    readEntity(sc, type, skipped, out);
  }
  return out;
}

function readHeader(sc: Scanner): DxfHeader {
  const h: DxfHeader = { insunits: null, acadver: "", codepage: "" };
  let name = "";
  while (sc.next()) {
    if (sc.is0("ENDSEC")) break;
    if (sc.code === 9) {
      name = sc.value.trim();
      continue;
    }
    if (name === "$INSUNITS" && sc.code === 70) h.insunits = toInt(sc.value);
    else if (name === "$ACADVER" && sc.code === 1) h.acadver = sc.value.trim();
    else if (name === "$DWGCODEPAGE" && sc.code === 3) h.codepage = sc.value.trim();
  }
  return h;
}

function readTables(sc: Scanner, layers: Map<string, DxfLayer>) {
  let table = "";
  while (sc.next()) {
    if (sc.is0("ENDSEC")) break;
    if (sc.code !== 0) continue;
    const v = sc.value.trim();
    if (v === "TABLE") {
      const g = readGroups(sc);
      table = (first(g, 2) ?? "").trim();
    } else if (v === "ENDTAB") {
      table = "";
    } else if (v === "LAYER" && table === "LAYER") {
      const g = readGroups(sc);
      const name = decodeDxfString((first(g, 2) ?? "").trim());
      if (!name) continue;
      const color = int(g, 62, 7);
      layers.set(name, { name, color: Math.abs(color) || 7, off: color < 0, frozen: (int(g, 70) & 1) === 1 });
    }
  }
}

function readBlocks(sc: Scanner, blocks: Map<string, DxfBlock>, skipped: Record<string, number>) {
  while (sc.next()) {
    if (sc.is0("ENDSEC")) break;
    if (!sc.is0("BLOCK")) continue;
    const g = readGroups(sc);
    const name = decodeDxfString((first(g, 2) ?? "").trim());
    const flags = int(g, 70);
    const entities = readEntities(sc, "ENDBLK", skipped);
    // ENDBLK 自己的群組碼
    if (sc.next() && sc.is0("ENDBLK")) readGroups(sc);
    if (!name) continue;
    blocks.set(name, { name, x: num(g, 10), y: num(g, 20), xref: (flags & (4 | 8)) !== 0, entities });
  }
}

export function readDxf(text: string, onProgress?: (fraction: number) => void): DxfData {
  const sc = new Scanner(text);
  const data: DxfData = {
    header: { insunits: null, acadver: "", codepage: "" },
    layers: new Map(),
    blocks: new Map(),
    entities: [],
    skipped: {},
  };
  let sections = 0;
  while (sc.next()) {
    if (sc.code === -2) throw new DxfFormatError("not a DXF");
    if (sc.is0("EOF")) break;
    if (!sc.is0("SECTION")) continue;
    if (!sc.next() || sc.code !== 2) continue;
    sections++;
    const name = sc.value.trim();
    if (name === "HEADER") data.header = readHeader(sc);
    else if (name === "TABLES") readTables(sc, data.layers);
    else if (name === "BLOCKS") readBlocks(sc, data.blocks, data.skipped);
    else if (name === "ENTITIES") {
      data.entities = readEntities(sc, "ENDSEC", data.skipped);
      sc.next();
    } else {
      while (sc.next() && !sc.is0("ENDSEC"));
    }
    onProgress?.(sc.progress);
  }
  if (!sections) throw new DxfFormatError("not a DXF");
  return data;
}

/** DXF 版本: 2007 (AC1021) 以後的檔案一律是 UTF-8 */
const isUtf8Version = (acadver: string) => /^AC(\d{4})$/.test(acadver) && Number(acadver.slice(2)) >= 1021;

const CODEPAGES: Record<string, string> = {
  ANSI_950: "big5",
  ANSI_936: "gbk",
  ANSI_932: "shift_jis",
  ANSI_949: "euc-kr",
  ANSI_874: "windows-874",
  ANSI_1250: "windows-1250",
  ANSI_1251: "windows-1251",
  ANSI_1252: "windows-1252",
  ANSI_1253: "windows-1253",
  ANSI_1254: "windows-1254",
  ANSI_1255: "windows-1255",
  ANSI_1256: "windows-1256",
  ANSI_1257: "windows-1257",
  ANSI_1258: "windows-1258",
};

export class BinaryDxfError extends Error {}

/**
 * 檔案內容 -> 文字. 2007 以後是 UTF-8; 更舊的照檔頭寫的字碼頁 (台灣的圖常是 ANSI_950 = Big5).
 * 內容剛好是合法的 UTF-8 就直接用 UTF-8 (有些軟體存舊版本也用 UTF-8).
 */
export function decodeDxf(buffer: ArrayBuffer): { text: string; encoding: string } {
  const bytes = new Uint8Array(buffer);
  const sentinel = "AutoCAD Binary DXF";
  let binary = bytes.length >= sentinel.length;
  for (let i = 0; binary && i < sentinel.length; i++) if (bytes[i] !== sentinel.charCodeAt(i)) binary = false;
  if (binary) throw new BinaryDxfError("binary DXF");
  // 檔頭只有 ASCII, 先用 latin1 看版本和字碼頁
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 256 * 1024)));
  const ver = /\$ACADVER\s*\r?\n\s*1\s*\r?\n([^\r\n]*)/.exec(head)?.[1]?.trim() ?? "";
  const cp = /\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n([^\r\n]*)/.exec(head)?.[1]?.trim().toUpperCase() ?? "";
  // 開頭的 BOM 拿掉
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  const body = bytes.subarray(start);
  if (isUtf8Version(ver)) return { text: new TextDecoder("utf-8").decode(body), encoding: "utf-8" };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(body), encoding: "utf-8" };
  } catch {
    const label = CODEPAGES[cp] ?? "windows-1252";
    try {
      return { text: new TextDecoder(label).decode(body), encoding: label };
    } catch {
      return { text: new TextDecoder("windows-1252").decode(body), encoding: "windows-1252" };
    }
  }
}
