import { describe, expect, it } from "vitest";
import type { AmrLive, LiveState } from "@/components/CanvasMap/liveStore";
import { CARRY_LIFT } from "../forkliftRig";
import { LiveTracks, TRAIL_MS, isJump } from "../liveTracks";
import { emptyFrame } from "../frame";
import { ALERT_BUMPER, ALERT_FORK } from "../alerts";

const amr = (patch: Partial<AmrLive> = {}): AmrLive => ({
  pose: { x: 0, y: 0, yaw: 0 },
  isOverdue: false,
  isPause: false,
  hasCargo: false,
  status: "",
  rawStatus: "",
  forkHeight: null,
  destination: null,
  battery: null,
  charging: false,
  speed: null,
  stepWaitMs: null,
  ...patch,
});

const state = (amrs: Record<string, AmrLive>): LiveState => ({
  amrs: new Map(Object.entries(amrs)),
  bbox: new Map(Object.keys(amrs).map((id) => [id, [[0, 0], [1, 0], [1, 1], [0, 0.5]]])),
  claimedRoads: new Map(),
  warnings: new Set(),
  warningInfos: new Map(),
  pointCloud: new Map(),
  mirMapId: new Map(),
  activeSubName: new Map(),
});

describe("LiveTracks", () => {
  it("新位置進來時從畫面上的位置等速走過去, 走的時間是平常隔多久來一筆", () => {
    const tracks = new LiveTracks();
    const out = emptyFrame();
    tracks.ingest(state({ a: amr({ pose: { x: 0, y: 0, yaw: 0 } }) }), 0);
    tracks.ingest(state({ a: amr({ pose: { x: 1, y: 2, yaw: 90 } }) }), 500);

    expect(tracks.read("a", out, 500)).toBe(true);
    expect(out.x).toBeCloseTo(0);
    tracks.read("a", out, 750);
    expect(out.x).toBeCloseTo(0.5);
    expect(out.y).toBeCloseTo(1);
    expect(out.yaw).toBeCloseTo(Math.PI / 4);
    tracks.read("a", out, 2000);
    expect(out.x).toBeCloseTo(1);
    expect(out.yaw).toBeCloseTo(Math.PI / 2);
  });

  it("一次跳很遠 (重新定位) 直接過去", () => {
    const tracks = new LiveTracks();
    const out = emptyFrame();
    tracks.ingest(state({ a: amr() }), 0);
    tracks.ingest(state({ a: amr({ pose: { x: 30, y: 0, yaw: 0 } }) }), 500);
    tracks.read("a", out, 501);
    expect(out.x).toBe(30);
  });

  it("離線、還沒收到車框的車不畫 (同 2D 地圖)", () => {
    const tracks = new LiveTracks();
    const out = emptyFrame();
    tracks.ingest(state({ a: amr({ isOverdue: true }) }), 0);
    expect(tracks.read("a", out, 0)).toBe(false);

    const noBox = state({ b: amr() });
    noBox.bbox.clear();
    tracks.ingest(noBox, 0);
    expect(tracks.read("b", out, 0)).toBe(false);
  });

  it("沒回報牙叉高度的車照取放貨狀態演: 取貨時升起來 (棧板已經在牙叉上), 放貨時降下去", () => {
    const tracks = new LiveTracks();
    const out = emptyFrame();
    const picking = amr({ rawStatus: "取貨中:車輛正在取貨,等待車輛回報動作完成" });
    tracks.ingest(state({ a: picking }), 0);
    tracks.read("a", out, 0);
    tracks.read("a", out, 500);
    expect(out.lift).toBe(0);
    expect(out.loaded).toBe(true);
    for (let t = 600; t <= 5000; t += 100) tracks.read("a", out, t);
    expect(out.lift).toBeCloseTo(CARRY_LIFT);

    // 取完了: hasCargo, 載著貨走 -> 牙叉停在載貨高度
    tracks.ingest(state({ a: amr({ hasCargo: true, rawStatus: "移動:..." }) }), 5000);
    for (let t = 5100; t <= 6000; t += 100) tracks.read("a", out, t);
    expect(out.lift).toBeCloseTo(CARRY_LIFT);

    tracks.ingest(state({ a: amr({ hasCargo: true, rawStatus: "放貨中:車輛正在放貨,等待車輛回報動作完成" }) }), 6000);
    for (let t = 6100; t <= 10000; t += 100) tracks.read("a", out, t);
    expect(out.lift).toBeCloseTo(0);
    expect(out.loaded).toBe(true);

    tracks.ingest(state({ a: amr({ hasCargo: false, rawStatus: "Standby" }) }), 10000);
    tracks.read("a", out, 10100);
    expect(out.loaded).toBe(false);
  });

  it("有回報牙叉高度 (mm) 的車照實際高度", () => {
    const tracks = new LiveTracks();
    const out = emptyFrame();
    tracks.ingest(state({ a: amr({ forkHeight: 1200 }) }), 0);
    for (let t = 0; t <= 3000; t += 100) tracks.read("a", out, t);
    expect(out.lift).toBeCloseTo(1.2);

    // 回報過以後, 0 也是真的 0 (不是沒回報)
    tracks.ingest(state({ a: amr({ forkHeight: 0, hasCargo: true }) }), 3000);
    for (let t = 3100; t <= 6000; t += 100) tracks.read("a", out, t);
    expect(out.lift).toBeCloseTo(0);
  });

  it("卡片篩選了別台車時淡化", () => {
    const tracks = new LiveTracks();
    const out = emptyFrame();
    tracks.filter = { ...tracks.filter, filterIds: new Set(["b"]) };
    tracks.ingest(state({ a: amr(), b: amr() }), 0);
    tracks.read("a", out, 0);
    expect(out.dim).toBe(true);
    tracks.read("b", out, 0);
    expect(out.dim).toBe(false);
  });

  it("告警照說明文字對到要閃的部位; 告警換了才重算, 沒告警的車是 0", () => {
    const tracks = new LiveTracks();
    const st = state({ a: amr(), b: amr() });
    st.warningInfos = new Map([["a", [{ warningId: "2004", info: "防撞邊條觸發" }, { warningId: "2010", info: "枒杈尖故障" }]]]);
    tracks.ingest(st, 0);
    const out = emptyFrame();
    expect(tracks.read("a", out, 0)).toBe(true);
    expect(out.alert).toBe(ALERT_BUMPER | ALERT_FORK);
    tracks.read("b", out, 0);
    expect(out.alert).toBe(0);

    st.warningInfos = new Map();
    tracks.ingest(st, 100);
    tracks.read("a", out, 100);
    expect(out.alert).toBe(0);
  });

  it("SW15 實車的座標要轉 (同 2D); 模擬的 SW15 就是地圖座標, 不轉、車頭也不反過來", () => {
    const st = state({ "#SW15-635": amr({ pose: { x: 51.9, y: -3.7, yaw: 90 } }) });
    const real = new LiveTracks();
    real.ingest(st, 0);
    const out = emptyFrame();
    real.read("#SW15-635", out, 0);
    expect(out.x).toBeCloseTo(-3.7 + 3.5, 5);
    expect(out.y).toBeCloseTo(-51.9 + 0.4, 5);
    expect(out.yaw).toBeCloseTo((270 * Math.PI) / 180, 5);

    const sim = new LiveTracks();
    sim.filter = { ...sim.filter, simulated: true };
    sim.ingest(st, 0);
    sim.read("#SW15-635", out, 0);
    expect(out.x).toBeCloseTo(51.9, 5);
    expect(out.y).toBeCloseTo(-3.7, 5);
    expect(out.yaw).toBeCloseTo(Math.PI / 2, 5);
  });

  it("軌跡: 記下收到的位置 (沒動就不記), 只留最近 TRAIL_MS, 車停著沒新資料也照時間丟掉", () => {
    const tracks = new LiveTracks();
    tracks.ingest(state({ a: amr({ pose: { x: 0, y: 0, yaw: 0 } }) }), 0);
    tracks.ingest(state({ a: amr({ pose: { x: 0, y: 0, yaw: 10 } }) }), 500);
    tracks.ingest(state({ a: amr({ pose: { x: 1, y: 0, yaw: 10 } }) }), 1000);
    expect(tracks.trailOf("a", 1000).map((p) => p.x)).toEqual([0, 1]);
    expect(tracks.trailOf("a", TRAIL_MS + 500).map((p) => p.x)).toEqual([1]);
    expect(tracks.trailOf("a", TRAIL_MS + 1001)).toEqual([]);
    expect(tracks.trailOf("nobody")).toEqual([]);
  });

  it("一下子跳太遠 (快過車子開得到的速度) 才算定位跳動; 停很久之後一跳也算", () => {
    const p = (x: number, t: number, seen = t) => ({ x, y: 0, t, seen });
    expect(isJump(p(0, 0), p(1, 1000))).toBe(false);
    expect(isJump(p(0, 0), p(2, 200))).toBe(true);
    // 很小的抖動不算
    expect(isJump(p(0, 0), p(0.3, 10))).toBe(false);
    // 停在原地 10 秒 (一直有回報), 然後跳 3m
    expect(isJump(p(0, 0, 10_000), p(3, 10_200))).toBe(true);
  });

  it("軌跡: 停在原地時更新最後還在那裡的時間, 不多記點", () => {
    const tracks = new LiveTracks();
    tracks.ingest(state({ a: amr({ pose: { x: 0, y: 0, yaw: 0 } }) }), 0);
    tracks.ingest(state({ a: amr({ pose: { x: 0, y: 0, yaw: 0 } }) }), 5000);
    tracks.ingest(state({ a: amr({ pose: { x: 3, y: 0, yaw: 0 } }) }), 5200);
    const [a, b] = tracks.trailOf("a", 5200);
    expect([a.t, a.seen, b.t]).toEqual([0, 5000, 5200]);
    expect(isJump(a, b)).toBe(true);
  });
});
