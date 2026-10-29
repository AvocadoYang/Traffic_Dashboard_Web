/**
 * 巡視模式 (給中控室大螢幕): 有車出現新的告警時鏡頭飛過去跟著那台車; 好幾台都有告警時每台輪流看一下;
 * 告警都沒了回到全景。使用者自己點車 / 取消跟車之後先停一陣子, 不跟人搶鏡頭。
 */

/** 好幾台都有告警時, 每台看多久 (ms) */
export const PATROL_DWELL_MS = 12_000;
/** 使用者自己操作後, 巡視先停多久 (ms) */
export const PATROL_PAUSE_MS = 30_000;

export type PatrolStep =
  /** 飛到這台車並跟著 */
  | { kind: "follow"; id: string }
  /** 告警都沒了: 回到全景 */
  | { kind: "overview" }
  | null;

export class Patrol {
  /** 目前在看哪台 (null = 全景) */
  current: string | null = null;
  private since = 0;
  private known = new Set<string>();
  private pausedUntil = 0;

  /** 使用者自己點了車或取消跟車 */
  pause(now: number) {
    this.pausedUntil = now + PATROL_PAUSE_MS;
  }

  /** 剛打開巡視: 從現在的告警重新開始 (已經有告警的車也算新的) */
  reset() {
    this.current = null;
    this.since = 0;
    this.known = new Set();
    this.pausedUntil = 0;
  }

  /**
   * warned: 現在有告警、地圖上看得到的車 (順序固定, 例如照車號)。回傳要做什麼, 不用動就是 null
   */
  step(warned: string[], now: number): PatrolStep {
    const fresh = warned.filter((id) => !this.known.has(id));
    this.known = new Set(warned);
    if (now < this.pausedUntil) return null;

    let next = this.current;
    if (fresh.length) next = fresh[0];
    else if (this.current !== null && !warned.includes(this.current)) next = warned[0] ?? null;
    else if (this.current === null && warned.length) next = warned[0];
    else if (this.current !== null && warned.length > 1 && now - this.since >= PATROL_DWELL_MS) {
      next = warned[(warned.indexOf(this.current) + 1) % warned.length];
    }

    if (next === this.current) return null;
    this.current = next;
    this.since = now;
    return next === null ? { kind: "overview" } : { kind: "follow", id: next };
  }
}
