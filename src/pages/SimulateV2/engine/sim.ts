/**
 * 模擬引擎本體.
 *
 * 時間推進: 車的移動每 0.1 秒算一步 (加減速、跟車、停車); 需求產生、取放貨完成、
 * 原地轉完這類事件照時間點觸發. 沒有車在動、也沒有東西會變的時候, 直接跳到下一個事件.
 *
 * 車跟車之間 (計劃 5.4):
 * - 車往前開之前要先預約前面的格 / 區; 預約不到就在已經預約到的盡頭停下來等.
 * - 車身 (前後各 r) 碰到的格和區都算這台車佔著, 車尾離開才放掉. 停在站點、待命點上的車
 *   只佔自己那個區 (和車身蓋到中心的別的區).
 * - 路口淨空: 要經過路口 (或兩條路線沒有點位的交叉處), 連後面一個車身長要一起預約到才進去;
 *   路口如果是一串雙向路線的入口, 那一串也要一起拿到.
 * - 窄道: 開進一串雙向路線之前, 要一起拿到這一串 (一直到下一段單向路線或目的地為止)
 *   每條窄道的方向, 和路上所有的站點、待命點. 中途不會在雙向路線上跟對向的車卡住.
 *   在路上的車換目的地 (派到新任務) 時, 目前所在的那一串要能馬上拿到才換.
 * - 互相等成一圈 (死結): 先讓圈裡的一台改走別條路, 不行就換群組裡別的站點 (或別的待命點),
 *   再不行就先去旁邊空的點位等、讓出路來; 都不行才停下來, 結果標出死結.
 */
import { buildNet, Net } from "./network";
import { MinHeap } from "./heap";
import { expSample, makeRng, mixSeed, Rng } from "./rng";
import { angDiff, costToGo, departTurn, estimateFromNode, followTo, planAvoiding, planFromNode, Profile } from "./routing";
import type {
  DeadlockInfo,
  Hotspot,
  Kpi,
  LoadRecord,
  SimInput,
  SimNote,
  SimOptions,
  SimResult,
  StationStats,
  Trace,
  VehicleStats,
} from "./types";

export const DT = 0.1;
const EPS = 1e-6;

// 事件
const EV_DEMAND = 0;
const EV_WORK_DONE = 1;
const EV_ROTATE_DONE = 2;
const EV_IDLE_CHECK = 3;

// 車的動作
const M_PARKED = 0;
const M_MOVING = 1;
const M_ROTATING = 2;
const M_WORKING = 3;

// 任務階段
const P_IDLE = 0;
const P_TO_PICK = 1;
const P_PICKING = 2;
const P_TO_DROP = 3;
const P_DROPPING = 4;
const P_HOME = 5;

// 時間分配 (同 TIME_BUCKETS 的順序)
const B_IDLE = 0;
const B_EMPTY = 1;
const B_LOADED = 2;
const B_PICK = 3;
const B_DROP = 4;
const B_TRAFFIC = 5;
const B_QUEUE = 6;

/** 閒置車擋路超過這麼久, 叫它讓開 */
const IDLE_BLOCK_SEC = 30;
/** 同一台車同一趟最多為了解開互卡改道幾次 */
const MAX_REROUTES = 10;

interface Event {
  kind: number;
  a: number;
}

interface RouteRes {
  id: number;
  s0: number;
  s1: number;
  /** 窄道 id (雙向路線上的格); 其他是 -1 */
  cor: number;
  /** 走窄道的方向 (1 / -1) */
  dir: number;
}

interface Route {
  arcs: number[];
  /** 路線上第 i 個點位在哪 (公尺), 長度 arcs.length + 1 */
  nodeS: Float64Array;
  len: number;
  res: RouteRes[];
  held: Uint8Array;
  /** 要停下來原地轉的位置 (公尺), 和轉完要走第幾個弧 */
  stops: { s: number; arcI: number }[];
  dest: number;
  /** 每個弧的速度上限 (車速和限速取小的) */
  cap: Float64Array;
  uniformCap: boolean;
  /** 路線上一串一串連續的雙向路線, 照順序 */
  runs: Run[];
}

/**
 * 一串連續的雙向路線 (中間可以經過路口、站點), 到下一段單向路線或目的地為止.
 * 車身要碰到 startS 之前, 要一起拿到裡面每條窄道的方向和路上所有的站點、待命點.
 */
interface Run {
  startS: number;
  endS: number;
  /** 窄道 -> [方向, 車尾走過哪裡可以放掉] */
  cors: Map<number, { dir: number; exitS: number }>;
  /** 路上的站點、待命點 (route.res 的索引) */
  stopIdxs: number[];
}

interface Load {
  id: number;
  row: number;
  src: string;
  priority: number;
  created: number;
  assigned: number;
  vehicle: number;
  pickNodes: number[];
  dropNodes: number[];
  pickNode: number;
  dropNode: number;
  pickStart: number;
  pickDone: number;
  dropStart: number;
  dropDone: number;
}

interface Veh {
  idx: number;
  name: string;
  typeIdx: number;
  length: number;
  width: number;
  /** [空車, 載貨] */
  prof: [Profile, Profile];
  motion: number;
  phase: number;
  /** 停著 / 作業中時在哪個點位; 在路上是 -1 */
  node: number;
  route: Route | null;
  s: number;
  v: number;
  arcI: number;
  nextRes: number;
  /** 下一串還沒拿到的雙向路線 (route.runs 的索引) */
  nextRun: number;
  stopI: number;
  /** resource id -> 佔了幾份 (同一條路線可能經過同一個區兩次) */
  held: Map<number, number>;
  /** 路線上佔著的格 / 區 (route.res 的索引) */
  heldList: number[];
  /** 出發時佔著、但不在新路線上的: 開出一個車身後放掉 */
  lingering: number[];
  /** 拿著的窄道 -> 方向、車尾走到哪裡放掉 */
  cor: Map<number, { dir: number; exitS: number }>;
  facing: number;
  reversed: boolean;
  load: Load | null;
  /** 訂了哪個待命點 */
  standby: number;
  target: number;
  blocked: boolean;
  blockedSince: number;
  idleCheckPending: boolean;
  waitFor: number[];
  waitRes: number;
  waitCor: number;
  waitIsQueue: boolean;
  /** 上次預約失敗時的 resVersion; 之後沒有東西放掉就不用再試 */
  lastTry: number;
  pending: { target: number; phase: number } | null;
  reroutes: number;
  /** 為了讓路先去別的點位等: 到了之後再出發去這裡; 沒有是 -1 */
  detourTo: number;
  rotStart: number;
  rotEnd: number;
  rotFrom: number;
  rotTo: number;
  time: Float64Array;
  tasks: number;
  dist: number;
}

interface RowGen {
  row: number;
  src: string;
  fromNodes: number[];
  dropNodes: number[];
  priority: number;
  rate: number;
  interval: number;
  fixed: boolean;
  phase: number;
  /** 時段 (一天中從幾秒開始、多長); null 代表整天 */
  window: { start: number; len: number } | null;
  rng: Rng;
  /** 暫存滿了、產線停下來的時間; 沒停是 -1 */
  heldSince: number;
  created: number;
  done: number;
  lineStops: number;
  lineStopSec: number;
}

const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

const parseClockSec = (s: string | null) => {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 : null;
};

const percentile = (sorted: number[], q: number) => {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
};

export class Simulator {
  readonly net: Net;
  private readonly input: SimInput;
  private readonly opts: SimOptions;
  private readonly r: number;
  private readonly T: number;
  private readonly W: number;
  private readonly startClock: number;
  private t = 0;
  private events = new MinHeap<Event>();
  private vehicles: Veh[] = [];
  private owner: Int32Array;
  private corMode: Int8Array;
  private corHolders: number[][];
  private resVersion = 0;
  private ctgCache = new Map<string, Float64Array>();
  private loads: Load[] = [];
  private queue: Load[] = [];
  private needDispatch = false;
  private gens: RowGen[] = [];
  private srcWaiting = new Map<string, number>();
  private srcCap = new Map<string, number>();
  private standbyOwner: Int32Array;
  private stationTargets: Int32Array;
  // 統計
  private heatRes: Float64Array;
  private heatCor: Float64Array;
  private stQueueTime: Float64Array;
  private stQueueMax: Int32Array;
  private stBusy: Float64Array;
  private stPicks: Int32Array;
  private stDrops: Int32Array;
  private stLineStops: Int32Array;
  private stLineStopSec: Float64Array;
  private hourly: { created: number; done: number }[];
  private notes: SimNote[] = [];
  private deadlock: DeadlockInfo | null = null;
  private noteSeen = new Map<string, number>();
  // 回放
  private readonly traceDt: number;
  private traceCount = 0;
  private traceCap = 0;
  private pose: Float32Array | null = null;
  private state: Uint8Array | null = null;
  private stepCount = 0;
  private stepHook: ((sim: Simulator) => void) | null = null;

  constructor(input: SimInput, opts: SimOptions = {}) {
    this.input = input;
    this.opts = opts;
    this.net = buildNet(input);
    this.r = this.net.r;
    this.T = Math.max(60, input.run.durationH * 3600);
    this.W = Math.min(this.T, Math.max(0, input.run.warmupMin * 60));
    this.startClock = parseClockSec(input.run.startClock) ?? 8 * 3600;
    const R = this.net.res.length;
    const N = this.net.nodes.length;
    this.owner = new Int32Array(R).fill(-1);
    this.corMode = new Int8Array(this.net.corridors.length);
    this.corHolders = this.net.corridors.map(() => []);
    this.standbyOwner = new Int32Array(N).fill(-1);
    this.stationTargets = new Int32Array(N);
    this.heatRes = new Float64Array(R);
    this.heatCor = new Float64Array(this.net.corridors.length);
    this.stQueueTime = new Float64Array(N);
    this.stQueueMax = new Int32Array(N);
    this.stBusy = new Float64Array(N);
    this.stPicks = new Int32Array(N);
    this.stDrops = new Int32Array(N);
    this.stLineStops = new Int32Array(N);
    this.stLineStopSec = new Float64Array(N);
    this.hourly = Array.from({ length: Math.ceil(this.T / 3600) }, () => ({ created: 0, done: 0 }));
    // 回放軌跡: 8 小時以內每 0.5 秒一筆, 更長就拉長間隔 (一台車最多約 6 萬筆)
    this.traceDt = opts.traceDt ?? Math.max(0.5, Math.ceil(this.T / 57600 / 0.5) * 0.5);
  }

  // ================================================================ 開始

  private profileOf(t: SimInput["vehicleTypes"][number], loaded: boolean): Profile {
    return {
      vcap: Math.max(0.05, loaded ? t.speedLoaded : t.speedEmpty),
      accel: Math.max(0.01, t.accel),
      decel: Math.max(0.01, t.decel),
      turnRate: (Math.max(1, t.turnSpeed) * Math.PI) / 180,
      thr: (Math.max(0, this.input.traffic.turnThresholdDeg) * Math.PI) / 180,
      canReverse: t.canReverse,
    };
  }

  private init() {
    const net = this.net;
    // 待命點照名稱排, 車依序放上去
    const standby = net.nodes
      .map((n, i) => ({ n, i }))
      .filter((x) => x.n.role === 2)
      .sort((a, b) => naturalCompare(a.n.name, b.n.name))
      .map((x) => x.i);
    let k = 0;
    this.input.vehicleTypes.forEach((type, typeIdx) => {
      for (let c = 0; c < type.count; c++) {
        const idx = this.vehicles.length;
        const v: Veh = {
          idx,
          name: `${type.name} ${c + 1}`,
          typeIdx,
          length: type.length,
          width: type.width,
          prof: [this.profileOf(type, false), this.profileOf(type, true)],
          motion: M_PARKED,
          phase: P_IDLE,
          node: -1,
          route: null,
          s: 0,
          v: 0,
          arcI: 0,
          nextRes: 0,
          nextRun: 0,
          stopI: 0,
          held: new Map(),
          heldList: [],
          lingering: [],
          cor: new Map(),
          facing: 0,
          reversed: false,
          load: null,
          standby: -1,
          target: -1,
          blocked: false,
          blockedSince: -1,
          idleCheckPending: false,
          waitFor: [],
          waitRes: -1,
          waitCor: -1,
          waitIsQueue: false,
          lastTry: -1,
          pending: null,
          reroutes: 0,
          detourTo: -1,
          rotStart: 0,
          rotEnd: 0,
          rotFrom: 0,
          rotTo: 0,
          time: new Float64Array(7),
          tasks: 0,
          dist: 0,
        };
        this.vehicles.push(v);
        // 待命點比車少時 (執行前檢查會擋) 多出來的車放在最後一個待命點, 不會動
        const node = standby[Math.min(k++, standby.length - 1)];
        if (node === undefined) continue;
        v.node = node;
        if (this.standbyOwner[node] < 0) {
          v.standby = node;
          this.standbyOwner[node] = idx;
        }
        const first = net.out[node][0] ?? net.inc[node][0];
        v.facing = first !== undefined ? net.arcs[first].heading : 0;
        const zone = net.nodes[node].zone;
        if (zone >= 0 && this.owner[zone] < 0) this.holdRes(v, zone);
      }
    });

    // 搬運需求
    const nodesOf = (ref: string, need: "pick" | "drop") => {
      const ni = net.nodeIndex.get(ref);
      const list = ni !== undefined ? [ni] : (net.groups.get(ref) ?? []);
      return list.filter((i) => (need === "pick" ? net.nodes[i].canPick : net.nodes[i].canDrop));
    };
    this.input.demand.forEach((row, rowIdx) => {
      const fromNodes = nodesOf(row.from, "pick");
      const dropNodes = nodesOf(row.to, "drop");
      if (!fromNodes.length || !dropNodes.length || !(row.perHour > 0)) return;
      const start = parseClockSec(row.start);
      const end = parseClockSec(row.end);
      const rng = makeRng(mixSeed(this.input.run.seed, rowIdx + 1));
      const g: RowGen = {
        row: rowIdx,
        src: row.from,
        fromNodes,
        dropNodes,
        priority: row.priority,
        rate: row.perHour / 3600,
        interval: 3600 / row.perHour,
        fixed: row.mode === "fixed",
        phase: rng(),
        window: start !== null && end !== null ? { start, len: (end - start + 86400) % 86400 || 86400 } : null,
        rng,
        heldSince: -1,
        created: 0,
        done: 0,
        lineStops: 0,
        lineStopSec: 0,
      };
      this.gens.push(g);
      if (!this.srcCap.has(g.src)) {
        // 暫存上限: 站點的設定; 群組是成員加總 (有一個不限就不限)
        const caps = fromNodes.map((i) => net.nodes[i].bufferMax);
        this.srcCap.set(g.src, caps.some((c) => c === null) ? Infinity : caps.reduce<number>((s, c) => s + (c ?? 0), 0));
        this.srcWaiting.set(g.src, 0);
      }
      const [s] = this.activeFrom(g, 0);
      this.scheduleDemand(this.gens.length - 1, g.fixed ? s + g.phase * g.interval : s + this.gap(g));
    });
  }

  // ================================================================ 搬運需求

  /** 包含 t、或在 t 之後的第一個有效時段 [start, end) (模擬秒數) */
  private activeFrom(g: RowGen, t: number): [number, number] {
    if (!g.window) return [t, Infinity];
    const clock = (((this.startClock + t) % 86400) + 86400) % 86400;
    const midnight = t - clock;
    for (let day = -1; day <= 1; day++) {
      const s = midnight + day * 86400 + g.window.start;
      const e = s + g.window.len;
      if (e > t + EPS) return [Math.max(s, t), e];
    }
    return [Infinity, Infinity];
  }

  private gap(g: RowGen) {
    return g.fixed ? g.interval : expSample(g.rng, g.rate);
  }

  /** 排下一板; 落在時段外就移到下一個時段開始 */
  private scheduleDemand(gi: number, at: number) {
    const g = this.gens[gi];
    let t = at;
    for (let i = 0; i < 4; i++) {
      const [s, e] = this.activeFrom(g, t);
      if (t >= s - EPS && t < e) break;
      t = g.fixed ? s + g.phase * g.interval : s + this.gap(g);
    }
    if (t < this.T) this.events.push(t, { kind: EV_DEMAND, a: gi });
  }

  private onDemand(gi: number) {
    const g = this.gens[gi];
    if ((this.srcWaiting.get(g.src) ?? 0) >= (this.srcCap.get(g.src) ?? Infinity)) {
      // 暫存滿了: 產線停下來等, 有板子被取走才繼續
      g.heldSince = this.t;
      return;
    }
    this.createLoad(g);
    this.scheduleDemand(gi, this.t + this.gap(g));
  }

  private createLoad(g: RowGen) {
    const load: Load = {
      id: this.loads.length,
      row: g.row,
      src: g.src,
      priority: g.priority,
      created: this.t,
      assigned: -1,
      vehicle: -1,
      pickNodes: g.fromNodes,
      dropNodes: g.dropNodes,
      pickNode: -1,
      dropNode: -1,
      pickStart: -1,
      pickDone: -1,
      dropStart: -1,
      dropDone: -1,
    };
    this.loads.push(load);
    if (this.inWindow(this.t)) g.created += 1;
    const h = this.hourly[Math.floor(this.t / 3600)];
    if (h) h.created += 1;
    this.srcWaiting.set(g.src, (this.srcWaiting.get(g.src) ?? 0) + 1);
    // 依優先序 (大的先)、再依產生的先後排隊
    let i = this.queue.length;
    while (i > 0 && this.queue[i - 1].priority < load.priority) i--;
    this.queue.splice(i, 0, load);
    this.needDispatch = true;
  }

  /** 取貨完成: 來源的暫存空出一格, 停下來的產線繼續 */
  private releaseSource(src: string) {
    this.srcWaiting.set(src, Math.max(0, (this.srcWaiting.get(src) ?? 1) - 1));
    const cap = this.srcCap.get(src) ?? Infinity;
    while ((this.srcWaiting.get(src) ?? 0) < cap) {
      let first = -1;
      this.gens.forEach((g, gi) => {
        if (g.src === src && g.heldSince >= 0 && (first < 0 || g.heldSince < this.gens[first].heldSince)) first = gi;
      });
      if (first < 0) return;
      const g = this.gens[first];
      const stopped = this.overlap(g.heldSince, this.t);
      if (stopped > 0) {
        g.lineStops += 1;
        g.lineStopSec += stopped;
        const ni = this.net.nodeIndex.get(src);
        if (ni !== undefined) {
          this.stLineStops[ni] += 1;
          this.stLineStopSec[ni] += stopped;
        }
      }
      g.heldSince = -1;
      this.createLoad(g);
      this.scheduleDemand(first, this.t + this.gap(g));
    }
  }

  // ================================================================ 統計時段

  private inWindow(t: number) {
    return t >= this.W - EPS && t <= this.T + EPS;
  }

  /** [a, b] 落在統計時段裡的長度 */
  private overlap(a: number, b: number) {
    return Math.max(0, Math.min(b, this.T) - Math.max(a, this.W));
  }

  // ================================================================ 找路

  private profOf(v: Veh, loaded = v.phase === P_TO_DROP) {
    return v.prof[loaded ? 1 : 0];
  }

  private ctg(v: Veh, loaded: boolean, target: number) {
    const k = `${v.typeIdx}:${loaded ? 1 : 0}|${target}`;
    let c = this.ctgCache.get(k);
    if (!c) {
      c = costToGo(this.net, this.profOf(v, loaded), target);
      this.ctgCache.set(k, c);
    }
    return c;
  }

  /** 車開到 target 大約要幾秒 (派車、挑站點、挑待命點用) */
  private estimate(v: Veh, target: number, loaded: boolean) {
    const p = this.profOf(v, loaded);
    const ctg = this.ctg(v, loaded, target);
    const R = v.route;
    if (R && v.s > EPS) {
      const ai = Math.min(v.arcI, R.arcs.length - 1);
      const arc = this.net.arcs[R.arcs[ai]];
      const rest = Math.max(0, R.nodeS[ai + 1] - v.s) / Math.min(p.vcap, arc.vmax);
      if (arc.to === target) return rest;
      return rest + ctg[R.arcs[ai]];
    }
    const node = v.node >= 0 ? v.node : R ? this.net.arcs[R.arcs[0]].from : -1;
    if (node < 0) return Infinity;
    return estimateFromNode(this.net, p, ctg, node, v.facing, target);
  }

  /** 這個弧走窄道是正方向 (1) 還是反方向 (-1) */
  private corDir(arc: number) {
    const a = this.net.arcs[arc];
    const ed = this.net.edges[a.edge];
    if (ed.corridor < 0) return 0;
    return a.fwd === ed.corFwd ? 1 : -1;
  }

  private buildRoute(v: Veh, arcs: number[], loaded: boolean): Route {
    const net = this.net;
    const r = this.r;
    const p = this.profOf(v, loaded);
    const n = arcs.length;
    const nodeS = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) nodeS[i + 1] = nodeS[i] + net.arcs[arcs[i]].len;
    const res: RouteRes[] = [];
    const pushZone = (node: number, s: number) => {
      const z = net.nodes[node].zone;
      if (z >= 0) res.push({ id: z, s0: s - r, s1: s + r, cor: -1, dir: 0 });
    };
    if (n > 0) pushZone(net.arcs[arcs[0]].from, 0);
    for (let i = 0; i < n; i++) {
      const arc = net.arcs[arcs[i]];
      const ed = net.edges[arc.edge];
      const base = nodeS[i];
      const dir = this.corDir(arcs[i]);
      if (arc.fwd) {
        for (let k = 0; k < ed.cells.length; k++) {
          res.push({ id: ed.cells[k], s0: base + ed.cellFrom[k], s1: base + ed.cellTo[k], cor: ed.corridor, dir });
        }
      } else {
        for (let k = ed.cells.length - 1; k >= 0; k--) {
          res.push({ id: ed.cells[k], s0: base + ed.len - ed.cellTo[k], s1: base + ed.len - ed.cellFrom[k], cor: ed.corridor, dir });
        }
      }
      pushZone(arc.to, nodeS[i + 1]);
    }
    // 照起點排: 很短的路線上, 下一個點的區會比中間那個長度 0 的格先碰到
    res.sort((a, b) => a.s0 - b.s0);
    const stops: Route["stops"] = [];
    for (let i = 1; i < n; i++) {
      if (angDiff(net.arcs[arcs[i - 1]].heading, net.arcs[arcs[i]].heading) > p.thr) stops.push({ s: nodeS[i], arcI: i });
    }
    const cap = new Float64Array(n);
    let uniformCap = true;
    for (let i = 0; i < n; i++) {
      cap[i] = Math.min(p.vcap, net.arcs[arcs[i]].vmax);
      if (cap[i] !== cap[0]) uniformCap = false;
    }
    // 一串一串的雙向路線
    const runs: Run[] = [];
    let cur: Run | null = null;
    for (let i = 0; i < n; i++) {
      const c = net.edges[net.arcs[arcs[i]].edge].corridor;
      if (c < 0) {
        cur = null;
        continue;
      }
      const dir = this.corDir(arcs[i]);
      // 同一條窄道反方向再走一次 (繞一圈回頭): 從這裡開始算另一串, 到這裡再拿反方向
      if (cur && cur.cors.has(c) && cur.cors.get(c)!.dir !== dir) cur = null;
      if (!cur) {
        cur = { startS: nodeS[i], endS: nodeS[i + 1], cors: new Map(), stopIdxs: [] };
        runs.push(cur);
      }
      cur.endS = nodeS[i + 1];
      const prev = cur.cors.get(c);
      if (!prev) cur.cors.set(c, { dir, exitS: nodeS[i + 1] });
      else prev.exitS = nodeS[i + 1];
    }
    for (const run of runs) {
      for (let j = 0; j < res.length; j++) {
        const X = net.res[res[j].id];
        const center = (res[j].s0 + res[j].s1) / 2;
        if (X.zone && X.stop && center >= run.startS - EPS && center <= run.endS + EPS) run.stopIdxs.push(j);
      }
    }
    return {
      arcs,
      nodeS,
      len: nodeS[n],
      res,
      held: new Uint8Array(res.length),
      stops,
      dest: n > 0 ? net.arcs[arcs[n - 1]].to : -1,
      cap,
      uniformCap,
      runs,
    };
  }

  // ================================================================ 佔用

  private holdRes(v: Veh, id: number) {
    v.held.set(id, (v.held.get(id) ?? 0) + 1);
    this.owner[id] = v.idx;
  }

  private releaseRes(v: Veh, id: number) {
    const c = (v.held.get(id) ?? 0) - 1;
    if (c > 0) {
      v.held.set(id, c);
      return;
    }
    v.held.delete(id);
    if (this.owner[id] === v.idx) this.owner[id] = -1;
    this.resVersion++;
  }

  private holdRouteRes(v: Veh, j: number) {
    const R = v.route!;
    if (R.held[j]) return;
    R.held[j] = 1;
    v.heldList.push(j);
    this.holdRes(v, R.res[j].id);
  }

  private lockOk(v: Veh, c: number, dir: number) {
    const h = this.corHolders[c];
    if (h.length === 0 || (h.length === 1 && h[0] === v.idx)) return true;
    return this.corMode[c] === dir;
  }

  private lock(v: Veh, c: number, dir: number, exitS: number) {
    const h = this.corHolders[c];
    if (!h.includes(v.idx)) h.push(v.idx);
    if (h.length === 1) this.corMode[c] = dir;
    v.cor.set(c, { dir, exitS });
  }

  private unlock(v: Veh, c: number) {
    const h = this.corHolders[c];
    const i = h.indexOf(v.idx);
    if (i >= 0) h.splice(i, 1);
    if (!h.length) this.corMode[c] = 0;
    v.cor.delete(c);
    this.resVersion++;
  }

  /** 這串雙向路線還沒走完的窄道是不是都已經拿到了 (方向也對) */
  private runHeld(v: Veh, run: Run) {
    const rear = v.s - this.r + 1e-9;
    for (const [c, h] of run.cors) if (h.exitS > rear && v.cor.get(c)?.dir !== h.dir) return false;
    return true;
  }

  /**
   * 預約 route.res[k] (k 是 -1 代表只拿下一串雙向路線), 連同路口淨空、
   * 車身會碰到的雙向路線 (窄道方向和路上的站點、待命點) 一起拿; 全部拿到才算.
   */
  private acquire(v: Veh, k: number): boolean {
    const R = v.route!;
    const net = this.net;
    const r = this.r;
    const idxs: number[] = k >= 0 ? [k] : [];
    const windowAfter = (b: number, from: number) => {
      const out: number[] = [];
      for (let j = from; j < R.res.length && R.res[j].s0 < b + 2 * r - EPS; j++) if (!R.held[j] && !idxs.includes(j)) out.push(j);
      return out;
    };
    // 路口和交叉的格: 不能停在上面等
    const junctionLike = (j: number) => {
      const X = net.res[R.res[j].id];
      return ((X.zone && X.junction) || X.crossing) && j !== R.res.length - 1;
    };
    if (k >= 0) {
      // 路口淨空: 路口和後面一個車身長要一起拿到. 從路口出發 (停在路口上) 時也一樣
      let base = -Infinity;
      if (junctionLike(k)) base = R.res[k].s1;
      else if (k > 0 && junctionLike(k - 1) && R.held[k - 1] && v.s - r < R.res[k - 1].s1 - EPS) base = R.res[k - 1].s1;
      if (base > -Infinity) idxs.push(...windowAfter(base, k + 1));
      // 順便拿到的 (前一個路口的淨空範圍裡): 交叉的格一定要連後面一起拿; 路口如果是下一串雙向路線的入口,
      // 也要連那串一起拿, 不然會停在入口上等, 擋住從那串路線出來的車.
      // 其他的路口不用 (一直線經過的單向走道, 不然整條走道都要一起拿)
      const entrance = (j: number) => {
        const c = (R.res[j].s0 + R.res[j].s1) / 2;
        for (let ri = v.nextRun; ri < R.runs.length; ri++) {
          if (Math.abs(R.runs[ri].startS - c) < 1e-6) return !this.runHeld(v, R.runs[ri]);
          if (R.runs[ri].startS > c) break;
        }
        return false;
      };
      for (let i = 1; i < idxs.length; i++) {
        const j0 = idxs[i];
        if (!junctionLike(j0)) continue;
        if (net.res[R.res[j0].id].crossing || entrance(j0)) idxs.push(...windowAfter(R.res[j0].s1, j0 + 1));
      }
    }
    // 車身會碰到的雙向路線: 整串一起拿
    let reach = k >= 0 ? -Infinity : R.runs[v.nextRun].startS + 2 * EPS;
    for (const j of idxs) reach = Math.max(reach, R.res[j].s1);
    const locks = new Map<number, { dir: number; exitS: number }>();
    const rear = v.s - r + 1e-9;
    let ri = v.nextRun;
    while (ri < R.runs.length && R.runs[ri].startS < reach - EPS) {
      const run = R.runs[ri];
      // 已經走過的窄道、站點不用再拿 (改路線之後, 這一串可能從車子後面就開始了)
      for (const [c, h] of run.cors) if (h.exitS > rear && v.cor.get(c)?.dir !== h.dir) locks.set(c, h);
      for (const j of run.stopIdxs) {
        if (R.held[j] || idxs.includes(j) || R.res[j].s1 <= rear) continue;
        idxs.push(j);
        reach = Math.max(reach, R.res[j].s1);
      }
      ri++;
    }

    let blockers: number[] | null = null;
    let failRes = -1;
    let failCor = -1;
    for (const j of idxs) {
      const id = R.res[j].id;
      const o = this.owner[id];
      if (o >= 0 && o !== v.idx) {
        (blockers ??= []).push(o);
        if (failRes < 0) failRes = id;
      }
      for (const c of net.res[id].conflicts) {
        const oc = this.owner[c];
        if (oc >= 0 && oc !== v.idx) {
          (blockers ??= []).push(oc);
          if (failRes < 0) failRes = id;
        }
      }
    }
    for (const [c, h] of locks) {
      if (!this.lockOk(v, c, h.dir)) {
        for (const x of this.corHolders[c]) if (x !== v.idx) (blockers ??= []).push(x);
        if (failCor < 0) failCor = c;
      }
    }
    if (blockers) {
      v.waitFor = [...new Set(blockers)];
      v.waitRes = failRes;
      v.waitCor = failRes >= 0 ? -1 : failCor;
      return false;
    }
    for (const j of idxs) this.holdRouteRes(v, j);
    for (const [c, h] of locks) this.lock(v, c, h.dir, h.exitS);
    v.nextRun = ri;
    return true;
  }

  /** 下一個還沒拿到的格 / 區從哪裡開始, 和下一串還沒拿到的雙向路線從哪裡開始 */
  private nextLimits(v: Veh): [number, number] {
    const R = v.route!;
    const rear = v.s - this.r + 1e-9;
    // 已經佔著的、或整個在車尾後面的 (很短的路線上那種長度 0 的格) 跳過
    while (v.nextRes < R.res.length && (R.held[v.nextRes] || R.res[v.nextRes].s1 <= rear)) v.nextRes++;
    while (v.nextRun < R.runs.length && (R.runs[v.nextRun].endS <= rear || this.runHeld(v, R.runs[v.nextRun]))) v.nextRun++;
    return [
      v.nextRes < R.res.length ? R.res[v.nextRes].s0 : Infinity,
      v.nextRun < R.runs.length ? R.runs[v.nextRun].startS : Infinity,
    ];
  }

  /** 把前面要用到的格 / 區、雙向路線預約起來 (預約到夠煞車就好) */
  private reserveAhead(v: Veh) {
    const R = v.route!;
    const p = this.profOf(v);
    const vn = Math.min(v.v + p.accel * DT, R.cap[Math.min(v.arcI, R.cap.length - 1)]);
    const need = v.s + this.r + vn * DT + (vn * vn) / (2 * p.decel) + 0.05;
    for (;;) {
      const [resS, runS] = this.nextLimits(v);
      if (Math.min(resS, runS) >= need) break;
      if (v.lastTry === this.resVersion) break;
      if (!this.acquire(v, runS <= resS ? -1 : v.nextRes)) {
        v.lastTry = this.resVersion;
        break;
      }
      v.lastTry = -1;
    }
  }

  /** 車尾走過的格 / 區、窄道放掉 */
  private releaseBehind(v: Veh) {
    const R = v.route!;
    const rear = v.s - this.r + 1e-9;
    for (let i = 0; i < v.heldList.length; ) {
      const j = v.heldList[i];
      if (R.res[j].s1 <= rear) {
        R.held[j] = 0;
        v.heldList[i] = v.heldList[v.heldList.length - 1];
        v.heldList.pop();
        this.releaseRes(v, R.res[j].id);
      } else i++;
    }
    if (v.cor.size) for (const [c, h] of v.cor) if (h.exitS <= rear) this.unlock(v, c);
    if (v.lingering.length && v.s >= this.r) {
      for (const id of v.lingering) this.releaseRes(v, id);
      v.lingering = [];
    }
  }

  // ================================================================ 開車

  /** 這一步之後速度最多多少, 才停得在 D 公尺內 */
  private safeStop(v0: number, D: number, d: number) {
    const k = (d * DT) / 2;
    const disc = k * k + 2 * d * D - d * v0 * DT;
    return disc <= 0 ? 0 : Math.max(0, -k + Math.sqrt(disc));
  }

  /** 這一步之後速度最多多少, 才來得及在 D 公尺內減到 vt */
  private safeTo(v0: number, D: number, vt: number, d: number) {
    const k = (d * DT) / 2;
    const disc = k * k + 2 * d * D - d * v0 * DT + vt * vt;
    return disc <= 0 ? 0 : Math.max(0, -k + Math.sqrt(disc));
  }

  private posOf(v: Veh): { x: number; y: number } {
    const net = this.net;
    if (v.route) {
      const R = v.route;
      const i = Math.min(v.arcI, R.arcs.length - 1);
      const arc = net.arcs[R.arcs[i]];
      const from = net.nodes[arc.from];
      const off = Math.min(arc.len, Math.max(0, v.s - R.nodeS[i]));
      return { x: from.x + arc.ux * off, y: from.y + arc.uy * off };
    }
    const n = net.nodes[v.node];
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  }

  private setBlocked(v: Veh, at: number) {
    v.v = 0;
    if (v.blocked) return;
    v.blocked = true;
    v.blockedSince = at;
    if (!v.idleCheckPending) {
      v.idleCheckPending = true;
      this.events.push(at + IDLE_BLOCK_SEC, { kind: EV_IDLE_CHECK, a: v.idx });
    }
  }

  /** 一台在路上的車走一步; 回傳有沒有動 */
  private stepMoving(v: Veh): boolean {
    const R = v.route!;
    const p = this.profOf(v);
    this.reserveAhead(v);
    const [resS, runS] = this.nextLimits(v);
    const resLimit = Math.min(resS, runS) - this.r;
    const stopS = v.stopI < R.stops.length ? R.stops[v.stopI].s : R.len;
    const atStop = stopS <= resLimit + EPS;
    const lim = Math.min(resLimit, stopS);
    const D = Math.max(0, lim - v.s);
    if (D <= EPS && v.v <= EPS) {
      if (atStop) {
        v.blocked = false;
        this.reachStop(v, this.t);
        return true;
      }
      this.setBlocked(v, this.t);
      return false;
    }
    const ai = Math.min(v.arcI, R.arcs.length - 1);
    const cap = R.cap[ai];
    let vNew = Math.min(v.v + p.accel * DT, cap, this.safeStop(v.v, D, p.decel));
    if (!R.uniformCap) {
      // 前面有比較慢的路段: 提早減速
      const range = v.s + (cap * cap) / (2 * p.decel) + cap * DT + 1;
      for (let j = ai + 1; j < R.arcs.length && R.nodeS[j] < range; j++) {
        if (R.cap[j] < vNew) vNew = Math.min(vNew, this.safeTo(v.v, Math.max(0, R.nodeS[j] - v.s), R.cap[j], p.decel));
      }
    }
    v.blocked = false;
    const ds = ((v.v + vNew) / 2) * DT;
    if (ds >= D - 1e-9) {
      // 這一步就會到要停的位置; 算出是這一步裡的哪個時間點到的
      const frac = v.v > EPS ? Math.min(DT, (2 * D) / v.v) : Math.min(DT, Math.sqrt((2 * D) / p.accel));
      this.advance(v, D);
      v.v = 0;
      this.releaseBehind(v);
      if (atStop) this.reachStop(v, this.t + frac);
      else this.setBlocked(v, this.t + frac);
      return true;
    }
    this.advance(v, ds);
    v.v = vNew;
    this.releaseBehind(v);
    return true;
  }

  private advance(v: Veh, ds: number) {
    const R = v.route!;
    v.s += ds;
    if (this.inWindow(this.t)) v.dist += ds;
    while (v.arcI < R.arcs.length - 1 && v.s >= R.nodeS[v.arcI + 1] - EPS) {
      v.arcI++;
      // 沒超過門檻的轉彎邊走邊轉, 車頭跟著路線; 要停下來原地轉的點, 車頭等轉的時候再改
      const turnHere = v.stopI < R.stops.length && Math.abs(R.stops[v.stopI].s - R.nodeS[v.arcI]) < 1e-6;
      if (turnHere) continue;
      const h = this.net.arcs[R.arcs[v.arcI]].heading;
      v.facing = v.reversed ? h + Math.PI : h;
    }
  }

  /** 到了要停的地方: 中途要原地轉的點, 或目的地 */
  private reachStop(v: Veh, at: number) {
    const R = v.route!;
    v.v = 0;
    if (v.stopI < R.stops.length) {
      const st = R.stops[v.stopI];
      v.arcI = st.arcI;
      this.startRotation(v, at, this.net.arcs[R.arcs[st.arcI]].heading, false);
      return;
    }
    this.arrive(v, at);
  }

  private startRotation(v: Veh, at: number, heading: number, departing: boolean) {
    const p = this.profOf(v);
    const { angle, reverse } = departTurn(p, v.facing, heading);
    const to = reverse ? heading + Math.PI : heading;
    v.reversed = reverse;
    // 出發時沒超過門檻就直接開 (邊走邊修正); 中途停下來的一定要轉
    if (angle <= EPS || (departing && angle <= p.thr)) {
      v.facing = to;
      v.motion = M_MOVING;
      if (!departing) v.stopI++;
      return;
    }
    const dur = angle / p.turnRate;
    v.motion = M_ROTATING;
    v.rotStart = at;
    v.rotEnd = at + dur;
    v.rotFrom = v.facing;
    v.rotTo = to;
    this.events.push(at + dur, { kind: EV_ROTATE_DONE, a: v.idx });
  }

  private onRotateDone(v: Veh) {
    if (v.motion !== M_ROTATING) return;
    v.facing = v.rotTo;
    v.motion = M_MOVING;
    if (v.route && v.s > EPS) v.stopI++;
    if (v.pending) {
      const pend = v.pending;
      v.pending = null;
      this.retarget(v, pend.target, pend.phase);
    }
  }

  // ================================================================ 出發、到達、改目的地

  /** 停著的車出發去 target; arcs 沒給就自己找最短的路 */
  private depart(v: Veh, target: number, phase: number, arcs?: number[] | null) {
    const loaded = phase === P_TO_DROP;
    v.phase = phase;
    v.target = target;
    v.reroutes = 0;
    v.detourTo = -1;
    const path = arcs ?? planFromNode(this.net, this.profOf(v, loaded), this.ctg(v, loaded, target), v.node, v.facing, target);
    if (path === null) {
      // 到不了 (執行前檢查會擋): 原地不動
      v.motion = M_PARKED;
      return;
    }
    if (path.length === 0) {
      this.arrive(v, this.t);
      return;
    }
    const R = this.buildRoute(v, path, loaded);
    v.s = 0;
    v.v = 0;
    this.adoptRoute(v, R, true);
    v.node = -1;
    v.arcI = 0;
    v.stopI = 0;
    v.blocked = false;
    v.lastTry = -1;
    this.startRotation(v, this.t, this.net.arcs[path[0]].heading, true);
  }

  /**
   * 換上新路線: 本來就佔著、新路線也會經過的格 / 區接著佔; 新路線用不到的放掉
   * (出發時車身還在原地的, 等開出一個車身再放). 窄道也一樣.
   */
  private adoptRoute(v: Veh, R: Route, departing: boolean) {
    const rear = v.s - this.r;
    const pool = new Map(v.held);
    for (const id of v.lingering) pool.set(id, (pool.get(id) ?? 1) - 1);
    v.heldList = [];
    const mapped = new Map<number, number>();
    for (let j = 0; j < R.res.length; j++) {
      const id = R.res[j].id;
      if ((pool.get(id) ?? 0) - (mapped.get(id) ?? 0) > 0 && R.res[j].s1 > rear + 1e-9) {
        R.held[j] = 1;
        v.heldList.push(j);
        mapped.set(id, (mapped.get(id) ?? 0) + 1);
      }
    }
    const extra: number[] = [];
    for (const [id, count] of pool) for (let i = mapped.get(id) ?? 0; i < count; i++) extra.push(id);
    if (departing) v.lingering = [...v.lingering, ...extra];
    else for (const id of extra) this.releaseRes(v, id);
    v.route = R;
    // 從頭找下一個要預約的 (已經走過、已經佔著的會跳過)
    v.nextRes = 0;
    v.nextRun = 0;
    // 窄道: 新路線還會照同一個方向走的留著 (更新放掉的位置), 用不到的放掉
    for (const [c, h] of [...v.cor]) {
      let exitS = -Infinity;
      for (const run of R.runs) {
        const x = run.cors.get(c);
        if (x && x.dir === h.dir && run.endS > rear + 1e-9) exitS = Math.max(exitS, x.exitS);
      }
      if (exitS > -Infinity) h.exitS = exitS;
      else this.unlock(v, c);
    }
  }

  /**
   * 停在路線上 s 這個位置 (站點、待命點) 的車還佔著哪些: 自己的區, 和車身蓋到中心的別的區
   * (站點離路口不到半個車身). 旁邊的格不算: 同一條路上的車一定會先碰到這個區,
   * 別條路上的車靠「點位離路線太近」的衝突擋住 (站點離路口 3 公尺, 車停在站點上不會擋到橫過路口的車).
   */
  private keepAtStop(rr: RouteRes, s: number) {
    return this.net.res[rr.id].zone && Math.abs((rr.s0 + rr.s1) / 2 - s) < this.r - 1e-9;
  }

  private arrive(v: Veh, at: number) {
    const net = this.net;
    const R = v.route;
    if (R) {
      // 留下車身還碰到的格 / 區, 其他放掉
      const end = R.len;
      for (const j of v.heldList) {
        const rr = R.res[j];
        if (!this.keepAtStop(rr, end)) this.releaseRes(v, rr.id);
      }
      v.heldList = [];
      for (const c of [...v.cor.keys()]) this.unlock(v, c);
      for (const id of v.lingering) this.releaseRes(v, id);
      v.lingering = [];
      v.node = R.dest;
      v.route = null;
    }
    v.s = 0;
    v.v = 0;
    v.blocked = false;
    const node = v.node;
    if (v.detourTo >= 0) {
      // 讓路的車到了暫停的點位: 接著出發去原本的目的地 (還過不去就在這裡等)
      const real = v.detourTo;
      v.motion = M_PARKED;
      this.depart(v, real, v.phase);
      return;
    }
    if (v.phase === P_TO_PICK) {
      v.phase = P_PICKING;
      v.motion = M_WORKING;
      v.load!.pickStart = at;
      this.events.push(at + net.nodes[node].pickSec, { kind: EV_WORK_DONE, a: v.idx });
    } else if (v.phase === P_TO_DROP) {
      v.phase = P_DROPPING;
      v.motion = M_WORKING;
      v.load!.dropStart = at;
      this.events.push(at + net.nodes[node].dropSec, { kind: EV_WORK_DONE, a: v.idx });
    } else {
      v.phase = P_IDLE;
      v.motion = M_PARKED;
    }
  }

  /** 換目的地 (派到新任務、或叫閒置車讓開); 從現在的位置到不了就回 false, 照原路走 */
  private retarget(v: Veh, target: number, phase: number): boolean {
    if (v.motion === M_WORKING) return false;
    v.detourTo = -1;
    if (v.motion === M_ROTATING) {
      // 出發前原地轉: 轉完再換; 中途停下來轉的先不換 (等它轉完開出去)
      if (v.s > EPS) return false;
      v.pending = { target, phase };
      v.phase = phase;
      return true;
    }
    if (v.motion === M_PARKED || !v.route) {
      v.motion = M_PARKED;
      this.depart(v, target, phase);
      return true;
    }
    // 還沒離開出發點: 當作停著, 重新出發
    if (v.s <= EPS && v.v <= EPS) {
      this.backToNode(v);
      this.depart(v, target, phase);
      return true;
    }
    const R = v.route;
    const loaded = phase === P_TO_DROP;
    const ai = Math.min(v.arcI, R.arcs.length - 1);
    const path = R.arcs.slice(0, ai + 1);
    if (this.net.arcs[path[path.length - 1]].to !== target) {
      if (followTo(this.net, this.profOf(v, loaded), this.ctg(v, loaded, target), path, target) === null) return false;
    }
    const NR = this.buildRoute(v, path, loaded);
    if (!this.canTakeRoute(v, NR)) return false;
    v.phase = phase;
    v.target = target;
    v.reroutes = 0;
    this.switchRoute(v, NR);
    return true;
  }

  /** 這個 resource 現在可不可以給 v (沒人佔著, 會撞到的也沒人佔著) */
  private resFree(v: Veh, id: number) {
    const o = this.owner[id];
    if (o >= 0 && o !== v.idx) return false;
    for (const c of this.net.res[id].conflicts) {
      const oc = this.owner[c];
      if (oc >= 0 && oc !== v.idx) return false;
    }
    return true;
  }

  /**
   * 在路上的車換成 R 這條路線: 車現在所在的那串雙向路線, 缺的窄道方向和路上的站點
   * 要能馬上全部拿到, 不然會停在雙向路線中間等, 擋住反方向要出來的車.
   */
  private canTakeRoute(v: Veh, R: Route): boolean {
    const rear = v.s - this.r + 1e-9;
    const front = v.s + this.r - 1e-9;
    // 不能繞一圈回頭, 反方向走進現在拿著的窄道 (後面跟著的車會把路堵住)
    for (const run of R.runs) {
      if (run.endS <= rear) continue;
      for (const [c, h] of run.cors) {
        const held = v.cor.get(c);
        if (held && held.dir !== h.dir) return false;
      }
    }
    for (const run of R.runs) {
      if (run.endS <= rear || run.startS >= front) continue;
      for (const [c, h] of run.cors) {
        if (h.exitS > rear && v.cor.get(c)?.dir !== h.dir && !this.lockOk(v, c, h.dir)) return false;
      }
      for (const j of run.stopIdxs) if (R.res[j].s1 > rear && !this.resFree(v, R.res[j].id)) return false;
    }
    return true;
  }

  /**
   * 在路上換一條新路線 (前面一段跟原本一樣). 車現在所在的那串雙向路線缺的部分馬上拿
   * (換之前 canTakeRoute 檢查過), 不然同一步裡別台車可能先拿走, 這台就卡在雙向路線中間.
   */
  private switchRoute(v: Veh, R: Route) {
    this.adoptRoute(v, R, false);
    v.stopI = 0;
    while (v.stopI < R.stops.length && R.stops[v.stopI].s < v.s - 1e-3) v.stopI++;
    v.lastTry = -1;
    const [, runS] = this.nextLimits(v);
    if (runS < v.s + this.r - 1e-9) this.acquire(v, -1);
  }

  /** 還停在出發點的車: 把路線拿掉, 回到停著的狀態 */
  private backToNode(v: Veh) {
    const R = v.route!;
    for (const j of v.heldList) {
      const rr = R.res[j];
      if (!this.keepAtStop(rr, 0)) this.releaseRes(v, rr.id);
    }
    v.heldList = [];
    for (const c of [...v.cor.keys()]) this.unlock(v, c);
    v.node = this.net.arcs[R.arcs[0]].from;
    v.route = null;
    v.motion = M_PARKED;
    v.blocked = false;
  }

  // ================================================================ 派車

  /**
   * 挑站點時多算的時間: 已經有車要去的、現在有別台車停在上面的, 群組裡的車會分散開,
   * 也比較不會派進被佔住的死巷.
   */
  private stationPenalty(v: Veh, m: number, workSec: number) {
    const z = this.net.nodes[m].zone;
    const occupied = z >= 0 && this.owner[z] >= 0 && this.owner[z] !== v.idx;
    return this.stationTargets[m] * (workSec + 10) + (occupied ? workSec + 60 : 0);
  }

  private dispatch() {
    this.needDispatch = false;
    if (!this.queue.length) return;
    const free = this.vehicles.filter((v) => (v.phase === P_IDLE || v.phase === P_HOME) && v.motion !== M_WORKING && !v.pending);
    for (let qi = 0; qi < this.queue.length && free.length; ) {
      const load = this.queue[qi];
      // 開過去最快的車和站點; 這台現在換不了路就換下一個
      const options: { v: Veh; m: number; est: number }[] = [];
      for (const v of free) {
        for (const m of load.pickNodes) {
          const est = this.estimate(v, m, false) + this.stationPenalty(v, m, this.net.nodes[m].pickSec);
          if (Number.isFinite(est)) options.push({ v, m, est });
        }
      }
      options.sort((a, b) => a.est - b.est || a.v.idx - b.v.idx || a.m - b.m);
      const tried = new Set<number>();
      let done: Veh | null = null;
      for (const o of options) {
        if (tried.has(o.v.idx)) continue;
        tried.add(o.v.idx);
        if (this.assign(o.v, load, o.m)) {
          done = o.v;
          break;
        }
      }
      if (!done) {
        qi++;
        continue;
      }
      this.queue.splice(qi, 1);
      free.splice(free.indexOf(done), 1);
    }
  }

  /** 派給 v; 它現在換不了路 (正在路口轉、前面的雙向路線被反方向佔著) 就不派, 回 false */
  private assign(v: Veh, load: Load, pickNode: number): boolean {
    const standby = v.standby;
    if (standby >= 0) {
      this.standbyOwner[standby] = -1;
      v.standby = -1;
    }
    v.load = load;
    this.stationTargets[pickNode]++;
    if (!this.retarget(v, pickNode, P_TO_PICK)) {
      this.stationTargets[pickNode]--;
      v.load = null;
      if (standby >= 0 && this.standbyOwner[standby] < 0) {
        this.standbyOwner[standby] = v.idx;
        v.standby = standby;
      }
      return false;
    }
    load.assigned = this.t;
    load.vehicle = v.idx;
    load.pickNode = pickNode;
    return true;
  }

  private chooseDrop(v: Veh, load: Load) {
    let best = -1;
    let bestT = Infinity;
    for (const m of load.dropNodes) {
      const est = this.estimate(v, m, true) + this.stationPenalty(v, m, this.net.nodes[m].dropSec);
      if (est < bestT - 1e-9) {
        bestT = est;
        best = m;
      }
    }
    return best >= 0 ? best : load.dropNodes[0];
  }

  /** 最近的空待命點; avoid 裡的 resource (擋到別人的路) 盡量不要 */
  private chooseStandby(v: Veh, exclude: number, avoid?: Set<number>) {
    let best = -1;
    let bestT = Infinity;
    for (let i = 0; i < this.net.nodes.length; i++) {
      if (this.net.nodes[i].role !== 2 || i === exclude) continue;
      if (this.standbyOwner[i] >= 0 && this.standbyOwner[i] !== v.idx) continue;
      let est = this.estimate(v, i, false);
      if (!Number.isFinite(est)) continue;
      if (avoid && avoid.has(this.net.nodes[i].zone)) est += 1e6;
      if (est < bestT - 1e-9) {
        bestT = est;
        best = i;
      }
    }
    return best;
  }

  private goHome(v: Veh) {
    const sb = this.chooseStandby(v, -1);
    if (sb < 0) return; // 沒有空的待命點: 停在原地
    v.standby = sb;
    this.standbyOwner[sb] = v.idx;
    if (sb !== v.node) this.depart(v, sb, P_HOME);
  }

  private onWorkDone(v: Veh) {
    const load = v.load!;
    const node = v.node;
    if (v.phase === P_PICKING) {
      load.pickDone = this.t;
      this.stationTargets[node]--;
      if (this.inWindow(this.t)) this.stPicks[node]++;
      this.releaseSource(load.src);
      const drop = this.chooseDrop(v, load);
      load.dropNode = drop;
      this.stationTargets[drop]++;
      v.motion = M_PARKED;
      this.depart(v, drop, P_TO_DROP);
      return;
    }
    if (v.phase === P_DROPPING) {
      load.dropDone = this.t;
      this.stationTargets[node]--;
      if (this.inWindow(this.t)) {
        this.stDrops[node]++;
        v.tasks++;
        const g = this.gens.find((x) => x.row === load.row);
        if (g) g.done += 1;
      }
      const h = this.hourly[Math.floor(this.t / 3600)];
      if (h) h.done += 1;
      v.load = null;
      v.phase = P_IDLE;
      v.motion = M_PARKED;
      // 有在等的需求就直接接下一張, 沒有才回待命點
      this.dispatch();
      if (v.phase === P_IDLE) this.goHome(v);
    }
  }

  /** 等了 30 秒還在等, 擋住它的是停著的閒置車: 叫閒置車去別的空待命點 */
  private onIdleCheck(w: Veh) {
    w.idleCheckPending = false;
    if (!this.isWaiting(w)) return;
    if (this.t - w.blockedSince < IDLE_BLOCK_SEC - EPS) {
      w.idleCheckPending = true;
      this.events.push(w.blockedSince + IDLE_BLOCK_SEC, { kind: EV_IDLE_CHECK, a: w.idx });
      return;
    }
    const avoid = new Set<number>();
    if (w.route) for (let j = w.nextRes; j < w.route.res.length; j++) avoid.add(w.route.res[j].id);
    for (const b of w.waitFor) {
      const u = this.vehicles[b];
      if (u.phase !== P_IDLE || u.motion !== M_PARKED) continue;
      const sb = this.chooseStandby(u, u.node, avoid);
      if (sb < 0) {
        this.note("no_standby_free", u);
        continue;
      }
      if (u.standby >= 0) this.standbyOwner[u.standby] = -1;
      u.standby = sb;
      this.standbyOwner[sb] = u.idx;
      this.depart(u, sb, P_HOME);
    }
    w.idleCheckPending = true;
    this.events.push(this.t + IDLE_BLOCK_SEC, { kind: EV_IDLE_CHECK, a: w.idx });
  }

  private note(code: SimNote["code"], v: Veh) {
    const key = `${code}|${v.idx}`;
    const last = this.noteSeen.get(key);
    if (last !== undefined && this.t - last < 600) return;
    this.noteSeen.set(key, this.t);
    if (this.notes.length >= 200) return;
    const p = this.posOf(v);
    this.notes.push({ code, t: this.t, vehicle: v.name, x: p.x, y: p.y });
  }

  // ================================================================ 死結

  private isWaiting(v: Veh) {
    return v.motion === M_MOVING && v.blocked && v.v <= EPS;
  }

  /** 互相等成一圈的車 (只看停著在等的); 沒有回 null */
  private findCycle(): Veh[] | null {
    const waiting = this.vehicles.filter((v) => this.isWaiting(v));
    if (waiting.length < 2) return null;
    const isW = new Set(waiting.map((v) => v.idx));
    const color = new Map<number, number>();
    const stack: number[] = [];
    let found: number[] | null = null;
    const dfs = (u: number): boolean => {
      color.set(u, 1);
      stack.push(u);
      for (const w of this.vehicles[u].waitFor) {
        if (!isW.has(w)) continue;
        const c = color.get(w) ?? 0;
        if (c === 1) {
          found = stack.slice(stack.indexOf(w));
          return true;
        }
        if (c === 0 && dfs(w)) return true;
      }
      stack.pop();
      color.set(u, 2);
      return false;
    };
    for (const v of waiting) if ((color.get(v.idx) ?? 0) === 0 && dfs(v.idx)) break;
    const cycle = found as number[] | null;
    return cycle ? cycle.map((i) => this.vehicles[i]) : null;
  }

  private checkDeadlock() {
    const cycle = this.findCycle();
    if (!cycle) return;
    const order = [...cycle].sort((a, b) => a.idx - b.idx);
    // 1. 同一個目的地改走別條路  2. 換群組裡別的站點 (或別的待命點)  3. 先去旁邊空的點位等, 讓出路來
    for (const step of ["route", "switch", "detour"] as const) {
      for (const v of order) {
        if (v.reroutes >= MAX_REROUTES) continue;
        if (this.resolveFor(v, cycle, step)) {
          this.note("reroute", v);
          return;
        }
      }
    }
    this.deadlock = {
      t: this.t,
      vehicles: cycle.map((v) => v.name),
      points: cycle.map((v) => this.posOf(v)),
    };
  }

  /**
   * 圈裡其他車佔著的、和它們接下來要走的. standing: 連不在圈裡、停在點位上的車也繞過去
   * (先去旁邊等的時候用: 穿過停著的車的路要等它先走, 它要走的方向又常常就是這台車讓出來的路,
   * 例如死巷裡的兩個站點)
   */
  private cycleBans(v: Veh, cycle: Veh[], standing = false) {
    const net = this.net;
    const others = cycle.filter((u) => u !== v);
    const otherIdx = new Set(others.map((u) => u.idx));
    const held = new Set<number>();
    for (let i = 0; i < this.owner.length; i++) if (otherIdx.has(this.owner[i])) held.add(i);
    for (const u of standing ? this.vehicles : []) {
      if (u === v) continue;
      const at = u.node >= 0 ? u.node : u.route && u.s <= EPS ? net.arcs[u.route.arcs[0]].from : -1;
      const z = at >= 0 ? net.nodes[at].zone : -1;
      if (z >= 0 && this.owner[z] === u.idx) held.add(z);
    }
    const ahead = new Set<number>(held);
    const cors = new Set<number>();
    for (const u of others) {
      // 現在拿著的窄道不能反方向走; 之後才要走的可以 (讓路的車從那裡離開)
      for (const c of u.cor.keys()) cors.add(c);
      const R = u.route;
      if (!R) continue;
      for (let j = u.nextRes; j < R.res.length; j++) ahead.add(R.res[j].id);
    }
    const touches = (id: number, set: Set<number>) => set.has(id) || net.res[id].conflicts.some((x) => set.has(x));
    const bannedArc = (arc: number) => {
      const a = net.arcs[arc];
      const ed = net.edges[a.edge];
      // 別台車拿著的窄道: 同方向 (跟在後面) 可以走, 反方向不行
      if (ed.corridor >= 0 && cors.has(ed.corridor) && this.corMode[ed.corridor] !== this.corDir(arc)) return true;
      const z = net.nodes[a.to].zone;
      if (z >= 0 && touches(z, held)) return true;
      return ed.cells.some((c) => touches(c, held));
    };
    return { bannedArc, touchesHeld: (id: number) => touches(id, held), touchesAhead: (id: number) => touches(id, ahead) };
  }

  /**
   * v 從現在的位置去 target、不走 banned 的路; 回傳整條路線的弧 (在路上的話含已經走的那段).
   * 在路上的車只能到下一個點位才換路, 卡住的地方在那之前就躲不掉.
   */
  private planFor(v: Veh, target: number, loaded: boolean, bannedArc: (arc: number) => boolean): number[] | null {
    const net = this.net;
    const p = this.profOf(v, loaded);
    const R = v.route;
    if (!R || v.s <= EPS) {
      const origin = v.node >= 0 ? v.node : R ? net.arcs[R.arcs[0]].from : -1;
      if (origin < 0) return null;
      return planAvoiding(net, p, -1, origin, v.facing, target, bannedArc);
    }
    const ai = Math.min(v.arcI, R.arcs.length - 1);
    // 剛好停在點位上 (弧的起點) 的話, 在這個點就可以換路
    const keep = ai > 0 && v.s <= R.nodeS[ai] + 1e-6 ? ai : ai + 1;
    const prefix = R.arcs.slice(0, keep);
    if (net.arcs[prefix[prefix.length - 1]].to === target) return prefix;
    const rest = planAvoiding(net, p, prefix[prefix.length - 1], -1, v.facing, target, bannedArc);
    return rest ? [...prefix, ...rest] : null;
  }

  /** 照 arcs 去 target (停著的車重新出發, 在路上的車換路線); 在路上換不了就回 false */
  private applyPlan(v: Veh, arcs: number[], target: number, phase: number): boolean {
    const reroutes = v.reroutes;
    if (!v.route || v.s <= EPS) {
      if (v.route) this.backToNode(v);
      const node = v.node;
      const first = arcs.findIndex((a) => this.net.arcs[a].from === node);
      this.depart(v, target, phase, first > 0 ? arcs.slice(first) : arcs);
    } else {
      const NR = this.buildRoute(v, arcs, phase === P_TO_DROP);
      if (!this.canTakeRoute(v, NR)) return false;
      v.phase = phase;
      v.target = target;
      this.switchRoute(v, NR);
    }
    v.reroutes = reroutes + 1;
    return true;
  }

  private resolveFor(v: Veh, cycle: Veh[], step: "route" | "switch" | "detour"): boolean {
    const net = this.net;
    const bans = this.cycleBans(v, cycle, step === "detour");
    const loaded = v.phase === P_TO_DROP;
    const R = v.route;
    if (step === "route") {
      const arcs = this.planFor(v, v.target, loaded, bans.bannedArc);
      if (!arcs || !arcs.length || !R) return false;
      // 跟原本的路一樣就沒用
      let same = arcs.length === R.arcs.length;
      for (let i = 0; same && i < arcs.length; i++) same = arcs[i] === R.arcs[i];
      if (same) return false;
      return this.applyPlan(v, arcs, v.target, v.phase);
    }
    // 候選的目的地: 由近到遠試前幾個
    const pickCandidates = (nodes: number[], extra: (m: number) => number) =>
      nodes
        .map((m) => ({ m, est: this.estimate(v, m, loaded) + extra(m) }))
        .filter((c) => Number.isFinite(c.est))
        .sort((a, b) => a.est - b.est)
        .slice(0, 8)
        .map((c) => c.m);
    const zoneOf = (m: number) => net.nodes[m].zone;
    if (step === "switch") {
      const load = v.load;
      // 換之前的階段: applyPlan 裡車可能馬上抵達 (又被派了新任務), 之後不能再看 v.phase
      const phase = v.phase;
      let options: number[];
      if (phase === P_TO_PICK && load) options = load.pickNodes;
      else if (phase === P_TO_DROP && load) options = load.dropNodes;
      else if (phase === P_HOME) options = net.nodes.map((_, i) => i).filter((i) => net.nodes[i].role === 2 && this.standbyOwner[i] < 0);
      else return false;
      // 車現在停的地方不算 (換過去等於原地不動, 解不開)
      const here = v.node >= 0 ? v.node : R && v.s <= EPS ? net.arcs[R.arcs[0]].from : -1;
      const work = (m: number) => (loaded ? net.nodes[m].dropSec : net.nodes[m].pickSec);
      const free = options.filter((m) => m !== v.target && m !== here && !(zoneOf(m) >= 0 && bans.touchesHeld(zoneOf(m))));
      for (const m of pickCandidates(free, (m) => (phase === P_HOME ? 0 : this.stationPenalty(v, m, work(m))))) {
        const arcs = this.planFor(v, m, loaded, bans.bannedArc);
        if (!arcs || !arcs.length) continue;
        const old = v.target;
        const oldStandby = v.standby;
        // 先記好新的目的地, 再出發 (出發時可能就抵達了, 抵達要看到對的站點和待命點)
        if (phase === P_HOME) {
          if (v.standby >= 0) this.standbyOwner[v.standby] = -1;
          v.standby = m;
          this.standbyOwner[m] = v.idx;
        } else {
          this.stationTargets[old]--;
          this.stationTargets[m]++;
          if (loaded) load!.dropNode = m;
          else load!.pickNode = m;
        }
        if (this.applyPlan(v, arcs, m, phase)) return true;
        // 換不了路: 還原
        if (phase === P_HOME) {
          this.standbyOwner[m] = -1;
          v.standby = oldStandby;
          if (oldStandby >= 0 && this.standbyOwner[oldStandby] < 0) this.standbyOwner[oldStandby] = v.idx;
        } else {
          this.stationTargets[m]--;
          this.stationTargets[old]++;
          if (loaded) load!.dropNode = old;
          else load!.pickNode = old;
        }
      }
      return false;
    }
    // detour: 旁邊沒車佔著、沒車要去、也不在圈裡其他車接下來的路上的站點或待命點
    const here = v.node >= 0 ? v.node : R && v.s <= EPS ? net.arcs[R.arcs[0]].from : -1;
    const spots = net.nodes
      .map((_, i) => i)
      .filter((i) => {
        const nd = net.nodes[i];
        if (nd.role === 0 || i === v.target || i === here || nd.zone < 0) return false;
        if (this.owner[nd.zone] >= 0 || this.stationTargets[i] > 0) return false;
        if (nd.role === 2 && this.standbyOwner[i] >= 0) return false;
        return !bans.touchesAhead(nd.zone);
      });
    for (const m of pickCandidates(spots, () => 0)) {
      const arcs = this.planFor(v, m, loaded, bans.bannedArc);
      if (!arcs) continue;
      const real = v.target;
      if (!this.applyPlan(v, arcs, m, v.phase)) continue;
      v.detourTo = real;
      return true;
    }
    return false;
  }

  // ================================================================ 統計

  private bucketOf(v: Veh) {
    if (v.motion === M_WORKING) return v.phase === P_PICKING ? B_PICK : B_DROP;
    if (v.phase === P_IDLE || v.phase === P_HOME) return B_IDLE;
    if (this.isWaiting(v)) return v.waitIsQueue ? B_QUEUE : B_TRAFFIC;
    return v.phase === P_TO_DROP ? B_LOADED : B_EMPTY;
  }

  /** 在等的車是不是在排隊等站點 (前面的車在那個站點作業、或也在排同一個站點) */
  private classifyQueues() {
    const net = this.net;
    for (const v of this.vehicles) v.waitIsQueue = false;
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (const v of this.vehicles) {
        if (v.waitIsQueue || !this.isWaiting(v) || (v.phase !== P_TO_PICK && v.phase !== P_TO_DROP)) continue;
        const dest = v.target;
        const destZone = net.nodes[dest].zone;
        let q = v.waitRes >= 0 && (v.waitRes === destZone || net.res[v.waitRes].conflicts.includes(destZone));
        if (!q) {
          for (const b of v.waitFor) {
            const u = this.vehicles[b];
            if (
              (u.node === dest && u.motion !== M_MOVING) ||
              (u.waitIsQueue && u.target === dest) ||
              (u.route !== null && u.s < 2 * this.r && net.arcs[u.route.arcs[0]].from === dest)
            ) {
              q = true;
              break;
            }
          }
        }
        if (q) {
          v.waitIsQueue = true;
          changed = true;
        }
      }
      if (!changed) break;
    }
  }

  private account(dt: number) {
    const span = this.overlap(this.t, this.t + dt);
    if (span <= 0) return;
    let counts: Map<number, number> | null = null;
    for (const v of this.vehicles) {
      const b = this.bucketOf(v);
      v.time[b] += span;
      if (b === B_PICK || b === B_DROP) this.stBusy[v.node] += span;
      else if (b === B_QUEUE) (counts ??= new Map()).set(v.target, (counts.get(v.target) ?? 0) + 1);
      else if (this.isWaiting(v)) {
        if (v.waitRes >= 0) this.heatRes[v.waitRes] += span;
        else if (v.waitCor >= 0) this.heatCor[v.waitCor] += span;
      }
    }
    if (counts) {
      for (const [node, c] of counts) {
        this.stQueueTime[node] += c * span;
        if (c > this.stQueueMax[node]) this.stQueueMax[node] = c;
      }
    }
  }

  // ================================================================ 回放

  private sampleUntil(tNow: number) {
    const pose = this.pose;
    const state = this.state;
    if (!pose || !state) return;
    const n = this.vehicles.length;
    while (this.traceCount * this.traceDt <= tNow + EPS && this.traceCount < this.traceCap) {
      const at = this.traceCount * this.traceDt;
      const base = this.traceCount * n;
      for (let i = 0; i < n; i++) {
        const v = this.vehicles[i];
        const p = this.posOf(v);
        let facing = v.facing;
        if (v.motion === M_ROTATING && v.rotEnd > v.rotStart) {
          const f = Math.min(1, Math.max(0, (at - v.rotStart) / (v.rotEnd - v.rotStart)));
          let d = (v.rotTo - v.rotFrom) % (2 * Math.PI);
          if (d > Math.PI) d -= 2 * Math.PI;
          if (d < -Math.PI) d += 2 * Math.PI;
          facing = v.rotFrom + d * f;
        }
        pose[(base + i) * 3] = p.x;
        pose[(base + i) * 3 + 1] = p.y;
        pose[(base + i) * 3 + 2] = facing;
        const loaded = v.phase === P_TO_DROP || v.phase === P_DROPPING;
        state[base + i] = this.bucketOf(v) | (loaded ? 0x10 : 0);
      }
      this.traceCount++;
    }
  }

  // ================================================================ 主迴圈

  run(): SimResult {
    const wall = Date.now();
    this.init();
    const n = this.vehicles.length;
    if (this.opts.trace !== false && n > 0) {
      this.traceCap = Math.floor(this.T / this.traceDt + 1e-9) + 1;
      this.pose = new Float32Array(this.traceCap * n * 3);
      this.state = new Uint8Array(this.traceCap * n);
    }
    const progressEvery = this.opts.progressEverySec ?? 600;
    let nextProgress = progressEvery;
    this.sampleUntil(0);
    while (this.t < this.T - EPS && !this.deadlock) {
      let active = false;
      // 到時間的事件 (照事件自己的時間點處理)
      const stepT = this.t;
      while (this.events.size && this.events.peekKey() <= stepT + EPS) {
        this.t = this.events.peekKey();
        this.handle(this.events.pop()!);
        active = true;
      }
      this.t = stepT;
      // 有需求在等時, 每 5 秒再派一次 (剛才換不了路的車, 現在可能可以了)
      if (this.queue.length && this.stepCount % 50 === 0) this.needDispatch = true;
      if (this.needDispatch) this.dispatch();
      // 車
      const before = this.resVersion;
      for (const v of this.vehicles) {
        if (v.motion === M_MOVING && v.route && this.stepMoving(v)) active = true;
      }
      if (this.resVersion !== before) active = true;
      this.stepCount++;
      if (this.stepCount % 10 === 0) this.checkDeadlock();
      if (this.deadlock) break;
      this.classifyQueues();
      // 都沒有在動、也沒有東西會變: 直接跳到下一個事件
      let dt = DT;
      if (!active) {
        this.checkDeadlock();
        if (this.deadlock) break;
        const next = Math.min(this.events.peekKey(), this.T);
        if (next > this.t + DT) dt = Math.ceil((next - this.t) / DT - 1e-9) * DT;
      }
      this.account(dt);
      this.t = Math.round((this.t + dt) * 1e6) / 1e6;
      this.sampleUntil(this.t);
      this.stepHook?.(this);
      if (this.opts.onProgress && this.t >= nextProgress) {
        this.opts.onProgress(this.t, this.T);
        nextProgress = (Math.floor(this.t / progressEvery) + 1) * progressEvery;
      }
    }
    return this.finish(Date.now() - wall);
  }

  private handle(ev: Event) {
    switch (ev.kind) {
      case EV_DEMAND:
        this.onDemand(ev.a);
        break;
      case EV_WORK_DONE:
        this.onWorkDone(this.vehicles[ev.a]);
        break;
      case EV_ROTATE_DONE:
        this.onRotateDone(this.vehicles[ev.a]);
        break;
      case EV_IDLE_CHECK:
        this.onIdleCheck(this.vehicles[ev.a]);
        break;
    }
  }

  // ================================================================ 結果

  private finish(wallMs: number): SimResult {
    const net = this.net;
    const end = this.deadlock ? this.deadlock.t : this.T;
    const span = Math.max(1e-9, end - this.W);
    const hours = span / 3600;

    const done = this.loads.filter((l) => l.dropDone >= 0 && this.inWindow(l.dropDone));
    const waits = this.loads
      .filter((l) => l.created >= this.W - EPS && l.pickStart >= 0)
      .map((l) => l.pickStart - l.created)
      .sort((a, b) => a - b);
    const totals = this.loads
      .filter((l) => l.created >= this.W - EPS && l.dropDone >= 0)
      .map((l) => l.dropDone - l.created)
      .sort((a, b) => a - b);
    let demandPerHour = 0;
    for (const g of this.gens) {
      // 統計時段內這一列有效的時間
      let active = 0;
      for (let t = this.W; t < end - EPS; ) {
        const [s, e] = this.activeFrom(g, t);
        if (s >= end) break;
        active += Math.min(e, end) - s;
        t = e;
      }
      demandPerHour += (g.rate * active) / hours;
    }
    const throughput = done.length / hours;
    let lineStopSec = this.gens.reduce((s, g) => s + g.lineStopSec, 0);
    let lineStopCount = this.gens.reduce((s, g) => s + g.lineStops, 0);
    // 結束時還停著的產線也算
    for (const g of this.gens) {
      if (g.heldSince < 0) continue;
      const stopped = this.overlap(g.heldSince, end);
      if (stopped <= 0) continue;
      lineStopSec += stopped;
      lineStopCount += 1;
      g.lineStops += 1;
      g.lineStopSec += stopped;
      const ni = net.nodeIndex.get(g.src);
      if (ni !== undefined) {
        this.stLineStops[ni] += 1;
        this.stLineStopSec[ni] += stopped;
      }
    }
    const vehicles: VehicleStats[] = this.vehicles.map((v) => ({
      name: v.name,
      typeName: this.input.vehicleTypes[v.typeIdx].name,
      time: Array.from(v.time),
      tasks: v.tasks,
      distance: v.dist,
    }));
    const busy = vehicles.length
      ? vehicles.reduce((s, v) => s + v.time.slice(1).reduce((a, b) => a + b, 0), 0) / (vehicles.length * span)
      : 0;
    const createdInWindow = this.loads.filter((l) => this.inWindow(l.created)).length;
    const createdPerHour = createdInWindow / hours;
    const lostPerHour = this.gens.reduce((s, g) => s + g.lineStopSec * g.rate, 0) / hours;
    const wanted = createdPerHour + lostPerHour;
    const kpi: Kpi = {
      throughputPerHour: throughput,
      demandPerHour,
      createdPerHour,
      lostPerHour,
      // 跟實際產生的比 (隨機到達每次產生的板數不一樣, 跟設定值比的話, 量剛好偏少的那一次會看起來很好),
      // 加上產線停等少產生的 (不然產線停了反而看起來達成率很高)
      achievement: wanted > 0 ? Math.min(1, throughput / wanted) : null,
      waitAvg: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
      waitP95: percentile(waits, 0.95),
      waitMax: waits.length ? waits[waits.length - 1] : null,
      taskAvg: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null,
      taskP95: percentile(totals, 0.95),
      utilization: busy,
      lineStopCount,
      lineStopSec,
      created: createdInWindow,
      completed: done.length,
      backlog: this.loads.filter((l) => l.pickDone < 0).length,
      inTransit: this.loads.filter((l) => l.pickDone >= 0 && l.dropDone < 0).length,
    };

    const stations: StationStats[] = [];
    for (let i = 0; i < net.nodes.length; i++) {
      const nd = net.nodes[i];
      if (nd.role !== 1) continue;
      stations.push({
        nodeId: nd.id,
        name: nd.name,
        picks: this.stPicks[i],
        drops: this.stDrops[i],
        avgQueue: this.stQueueTime[i] / span,
        maxQueue: this.stQueueMax[i],
        occupancy: this.stBusy[i] / span,
        lineStops: this.stLineStops[i],
        lineStopSec: this.stLineStopSec[i],
      });
    }

    // 塞車熱點: 格算到路線上, 區算到點位上, 窄道整條平均分到每條路線
    const pathHeat: Record<string, number> = {};
    const nodeHeat: Record<string, number> = {};
    const hot: Hotspot[] = [];
    const edgeSum = new Float64Array(net.edges.length);
    for (let i = 0; i < net.res.length; i++) {
      const h = this.heatRes[i];
      if (h <= 0) continue;
      const x = net.res[i];
      if (x.zone) {
        const nd = net.nodes[x.node];
        nodeHeat[nd.id] = (nodeHeat[nd.id] ?? 0) + h;
        hot.push({ kind: "node", ids: [nd.id], label: nd.name, sec: h, x: nd.x, y: nd.y });
      } else edgeSum[x.edge] += h;
    }
    for (let e = 0; e < net.edges.length; e++) {
      if (edgeSum[e] <= 0) continue;
      const ed = net.edges[e];
      pathHeat[ed.pathId] = (pathHeat[ed.pathId] ?? 0) + edgeSum[e];
      const a = net.nodes[ed.a];
      const b = net.nodes[ed.b];
      hot.push({ kind: "path", ids: [ed.pathId], label: `${a.name} – ${b.name}`, sec: edgeSum[e], x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    }
    for (let c = 0; c < net.corridors.length; c++) {
      const h = this.heatCor[c];
      if (h <= 0) continue;
      const edges = net.corridors[c].edges;
      for (const e of edges) pathHeat[net.edges[e].pathId] = (pathHeat[net.edges[e].pathId] ?? 0) + h / edges.length;
      const first = net.edges[edges[0]];
      const last = net.edges[edges[edges.length - 1]];
      const startNode = net.nodes[first.corFwd ? first.a : first.b];
      const endNode = net.nodes[last.corFwd ? last.b : last.a];
      const mid = net.edges[edges[Math.floor(edges.length / 2)]];
      hot.push({
        kind: "corridor",
        ids: edges.map((e) => net.edges[e].pathId),
        label: `${startNode.name} … ${endNode.name}`,
        sec: h,
        x: (net.nodes[mid.a].x + net.nodes[mid.b].x) / 2,
        y: (net.nodes[mid.a].y + net.nodes[mid.b].y) / 2,
      });
    }
    hot.sort((a, b) => b.sec - a.sec);

    const loads: LoadRecord[] = this.loads.map((l) => ({
      id: l.id + 1,
      row: l.row,
      created: l.created,
      assigned: l.assigned,
      pickStart: l.pickStart,
      pickDone: l.pickDone,
      dropStart: l.dropStart,
      dropDone: l.dropDone,
      vehicle: l.vehicle >= 0 ? this.vehicles[l.vehicle].name : null,
      from: l.pickNode >= 0 ? net.nodes[l.pickNode].id : null,
      to: l.dropNode >= 0 ? net.nodes[l.dropNode].id : null,
    }));

    let trace: Trace | null = null;
    if (this.pose && this.state) {
      const n = this.vehicles.length;
      trace = {
        dt: this.traceDt,
        count: this.traceCount,
        vehicles: this.vehicles.map((v) => ({
          name: v.name,
          type: this.input.vehicleTypes[v.typeIdx].name,
          length: v.length,
          width: v.width,
        })),
        pose: this.pose.slice(0, this.traceCount * n * 3),
        state: this.state.slice(0, this.traceCount * n),
      };
    }

    return {
      durationSec: this.T,
      endSec: end,
      warmupSec: this.W,
      startClock: this.input.run.startClock,
      wallMs,
      kpi,
      vehicles,
      stations,
      hotspots: hot.slice(0, 10),
      heat: { paths: pathHeat, nodes: nodeHeat },
      hourly: this.hourly,
      rows: this.input.demand.map((_, i) => {
        const g = this.gens.find((x) => x.row === i);
        return { created: g?.created ?? 0, done: g?.done ?? 0, lineStops: g?.lineStops ?? 0, lineStopSec: g?.lineStopSec ?? 0 };
      }),
      loads,
      deadlock: this.deadlock,
      notes: this.notes,
      trace,
    };
  }

  // ================================================================ 測試用

  /** 檢查內部狀態有沒有矛盾: 同一格兩台車、互斥的兩格同時有車、窄道兩個方向同時有車 */
  checkInvariants(): string[] {
    const errors: string[] = [];
    for (const v of this.vehicles) {
      for (const id of v.held.keys()) {
        if (this.owner[id] !== v.idx) errors.push(`${v.name}: resource ${id} owner is ${this.owner[id]}`);
        for (const c of this.net.res[id].conflicts) {
          const o = this.owner[c];
          if (o >= 0 && o !== v.idx) errors.push(`${v.name}: resource ${id} conflicts with ${c} held by ${this.vehicles[o].name}`);
        }
      }
    }
    for (let c = 0; c < this.corHolders.length; c++) {
      const dirs = new Set(this.corHolders[c].map((i) => this.vehicles[i].cor.get(c)?.dir));
      if (dirs.size > 1) errors.push(`corridor ${c} held in both directions`);
    }
    // 在雙向路線中間的車一定要拿著那條窄道 (方向也要對)
    for (const v of this.vehicles) {
      const R = v.route;
      if (!R || v.motion !== M_MOVING) continue;
      const i = Math.min(v.arcI, R.arcs.length - 1);
      const ed = this.net.edges[this.net.arcs[R.arcs[i]].edge];
      if (ed.corridor < 0 || v.s <= R.nodeS[i] + 1e-6 || v.s >= R.nodeS[i + 1] - 1e-6) continue;
      if (v.cor.get(ed.corridor)?.dir !== this.corDir(R.arcs[i])) errors.push(`${v.name}: inside corridor ${ed.corridor} without its lock`);
    }
    return errors;
  }

  /** 每台車目前的狀態 (測試用) */
  snapshot() {
    const net = this.net;
    const resName = (id: number) => {
      if (id < 0) return null;
      const x = net.res[id];
      if (x.zone) return `zone ${net.nodes[x.node].name}`;
      const ed = net.edges[x.edge];
      return `cell ${net.nodes[ed.a].name}-${net.nodes[ed.b].name}#${ed.cells.indexOf(id)}`;
    };
    return this.vehicles.map((v) => ({
      name: v.name,
      motion: v.motion,
      phase: v.phase,
      waiting: this.isWaiting(v),
      node: v.node >= 0 ? net.nodes[v.node].name : null,
      target: v.target >= 0 ? net.nodes[v.target].name : null,
      pos: this.posOf(v),
      held: [...v.held.keys()].map(resName),
      cor: [...v.cor.entries()].map(([c, h]) => ({ c, dir: h.dir })),
      waitFor: v.waitFor.map((i) => this.vehicles[i].name),
      waitRes: resName(v.waitRes),
      waitCor: v.waitCor,
      s: v.s,
      v: v.v,
      route: v.route ? v.route.arcs.map((a) => `${net.nodes[net.arcs[a].from].name}>${net.nodes[net.arcs[a].to].name}`).join(" ") : null,
    }));
  }

  /** 一步一步跑 (測試用): 每一步之後呼叫 onStep */
  runWithHook(onStep: (sim: Simulator) => void): SimResult {
    this.stepHook = onStep;
    return this.run();
  }

  get time() {
    return this.t;
  }
}

export function runSimulation(input: SimInput, opts: SimOptions = {}): SimResult {
  return new Simulator(input, opts).run();
}
