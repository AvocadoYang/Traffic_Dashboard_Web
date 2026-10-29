import type { AmrLive, LiveState } from "@/components/CanvasMap/liveStore";
import { amrShownAt, usesSW15Frame } from "@/components/CanvasMap/draw";
import type { VehicleFrame } from "./frame";
import { CARRY_LIFT } from "./forkliftRig";
import { alertZones } from "./alerts";

/**
 * 即時資料 -> 每一幀車子的樣子。
 *
 * amr-profile 大約一秒來幾次, 直接套用車子會一頓一頓地跳。收到新位置時從畫面上現在的位置出發,
 * 用「平常隔多久來一次」的時間等速走過去, 剛好在下一筆到的時候走到。
 *
 * 牙叉: 車子有回報高度 (IO.fork.current_height, mm) 就照實際的; 沒回報的車 (模擬車一直是 0)
 * 照取放貨狀態演: 取貨時升起來、放貨時降下去, 載著貨行駛時停在 CARRY_LIFT。
 */

/** 牙叉升降速度 (公尺/秒): 照狀態演的 / 有回報高度的 (只是把跳動抹平) */
const LIFT_SPEED = 0.3;
const REPORTED_LIFT_SPEED = 1.2;
/** 開始取放貨後, 牙叉先停多久才升降 (伸進棧板 / 對位) */
const ACTION_DELAY_MS = 1000;
/** 一次跳超過這麼遠 (公尺) 就直接過去, 不走動畫 (重新定位、換地圖) */
const TELEPORT_M = 5;

/**
 * 取放貨進行中的狀態文字: 後端 FleetAgent 取貨 / 放貨子狀態機 (customLoadMachine / customOffload)
 * 在等車子做完動作時送的 rosStatus, 例如「取貨中:車輛正在取貨,等待車輛回報動作完成」。
 * amr-profile 沒有別的欄位說車子正在取放貨, 只能認這段文字開頭。
 */
const PICKING_PREFIX = "取貨中";
const DROPPING_PREFIX = "放貨中";

type Pose = { x: number; y: number; yaw: number };

type Track = {
  /** 最後處理過的那筆資料 (liveStore 每筆新訊息會換一個物件) */
  src: AmrLive | null;
  from: Pose;
  to: Pose;
  start: number;
  duration: number;
  /** 上一筆訊息的時間、平常隔多久來一次 (ms) */
  lastAt: number;
  interval: number;
  lift: number;
  liftAt: number;
  /** 這台車回報過不是 0 的牙叉高度 (有在回報) */
  reportsHeight: boolean;
  height: number;
  action: "pick" | "drop" | null;
  actionSince: number;
  loaded: boolean;
};

const shortAngle = (from: number, to: number) => {
  let d = (to - from) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

const poseAt = (t: Track, now: number, out: Pose) => {
  const f = t.duration > 0 ? Math.min(1, Math.max(0, (now - t.start) / t.duration)) : 1;
  out.x = t.from.x + (t.to.x - t.from.x) * f;
  out.y = t.from.y + (t.to.y - t.from.y) * f;
  out.yaw = t.from.yaw + shortAngle(t.from.yaw, t.to.yaw) * f;
  return out;
};

const actionOf = (status: string) => (status.startsWith(PICKING_PREFIX) ? "pick" : status.startsWith(DROPPING_PREFIX) ? "drop" : null);

export type LiveFilter = {
  currentMapId: string | null;
  /** 車卡片點選的車; 有選的時候其他車變淡 (同 2D 地圖) */
  filterIds: Set<string>;
  /** 被區域禁止的車 */
  forbiddenIds: Set<string>;
  color: (id: string) => string;
  /** 模擬模式: 畫的都是模擬車 (SW15 不用轉座標) */
  simulated: boolean;
};

export class LiveTracks {
  private tracks = new Map<string, Track>();
  private state: LiveState | null = null;
  /** 告警換了才重算每台車要閃哪裡 */
  private alertsOf: LiveState["warningInfos"] | null = null;
  private alerts = new Map<string, number>();
  filter: LiveFilter = {
    currentMapId: null,
    filterIds: new Set(),
    forbiddenIds: new Set(),
    color: () => "#888888",
    simulated: false,
  };

  /** liveStore 有新資料時呼叫 */
  ingest(state: LiveState, now: number) {
    this.state = state;
    if (state.warningInfos !== this.alertsOf) {
      this.alertsOf = state.warningInfos;
      this.alerts = new Map([...state.warningInfos].map(([id, list]) => [id, alertZones(list.map((m) => m.info))]));
    }
    for (const [id, a] of state.amrs) {
      let t = this.tracks.get(id);
      if (t?.src === a) continue;
      const at = amrShownAt(state, id, this.filter.currentMapId, this.filter.simulated);
      if (!at) {
        if (t) t.src = a;
        continue;
      }
      // SW15 實車的車頭在 2D 地圖上也是反過來畫的 (draw.ts)
      const pose = {
        x: at.x,
        y: at.y,
        yaw: ((at.yaw + (usesSW15Frame(id, this.filter.simulated) ? 180 : 0)) * Math.PI) / 180,
      };
      if (!t) {
        t = {
          src: a,
          from: pose,
          to: pose,
          start: now,
          duration: 0,
          lastAt: now,
          interval: 500,
          lift: 0,
          liftAt: now,
          reportsHeight: false,
          height: 0,
          action: null,
          actionSince: now,
          loaded: false,
        };
        this.tracks.set(id, t);
      } else {
        t.src = a;
        t.interval = Math.min(1500, Math.max(50, t.interval * 0.7 + (now - t.lastAt) * 0.3));
        t.lastAt = now;
        const current = poseAt(t, now, { x: 0, y: 0, yaw: 0 });
        const moved = pose.x !== t.to.x || pose.y !== t.to.y || pose.yaw !== t.to.yaw;
        if (Math.hypot(pose.x - current.x, pose.y - current.y) > TELEPORT_M) {
          t.from = pose;
          t.to = pose;
          t.duration = 0;
        } else if (moved) {
          t.from = current;
          t.to = pose;
          t.start = now;
          t.duration = t.interval;
        }
      }
      if (a.forkHeight !== null && a.forkHeight !== 0) t.reportsHeight = true;
      t.height = (a.forkHeight ?? 0) / 1000;
      const action = actionOf(a.rawStatus);
      if (action !== t.action) {
        t.action = action;
        t.actionSince = now;
      }
      t.loaded = a.hasCargo;
    }
  }

  /** Vehicle3D 每一幀問的 */
  read = (id: string, out: VehicleFrame, now = performance.now()): boolean => {
    const t = this.tracks.get(id);
    const state = this.state;
    if (!t || !state || !amrShownAt(state, id, this.filter.currentMapId, this.filter.simulated)) return false;
    poseAt(t, now, out);

    const started = now - t.actionSince > ACTION_DELAY_MS;
    const target = t.reportsHeight
      ? t.height
      : t.action === "pick"
        ? started
          ? CARRY_LIFT
          : t.lift
        : t.action === "drop"
          ? started
            ? 0
            : t.lift
          : t.loaded
            ? CARRY_LIFT
            : 0;
    const step = ((t.reportsHeight ? REPORTED_LIFT_SPEED : LIFT_SPEED) * Math.min(now - t.liftAt, 500)) / 1000;
    t.liftAt = now;
    t.lift += Math.max(-step, Math.min(step, target - t.lift));
    out.lift = t.lift;
    // 取貨時棧板已經在牙叉上 (正要被抬起來); 放貨時 hasCargo 到放完才會變 false
    out.loaded = t.loaded || t.action === "pick";

    const { filterIds, forbiddenIds } = this.filter;
    const highlighted = filterIds.size ? filterIds.has(id) : forbiddenIds.has(id);
    out.dim = (filterIds.size > 0 || forbiddenIds.size > 0) && !highlighted;
    out.ring = this.filter.color(id);
    out.alert = this.alerts.get(id) ?? 0;
    return true;
  };

  /** 畫面上這台車現在在哪 (跟車用) */
  positionOf(id: string, now = performance.now()) {
    const t = this.tracks.get(id);
    return t ? poseAt(t, now, { x: 0, y: 0, yaw: 0 }) : null;
  }
}
