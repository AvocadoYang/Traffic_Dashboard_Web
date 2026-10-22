/**
 * 測試用: 仿一般倉庫的地圖, 量速度和看會不會卡死.
 * 單向往上的走道, 走道兩側每 1.6 公尺一條儲位道 (兩個儲位、雙向、底是死路),
 * 下面一條雙向主幹道, 上面單向繞回來; 包裝線出口在右邊、出貨口在左邊, 待命點在主幹道下面.
 */
import { Layout } from "./layout";

export function warehouse(opts: { aisles?: number; lanes?: number; vehicles?: number; durationH?: number; seed?: number } = {}) {
  const aisles = opts.aisles ?? 4;
  const lanes = opts.lanes ?? 20;
  const n = opts.vehicles ?? 10;
  const L = new Layout();
  const stacks: string[] = [];
  const aisleX = (i: number) => i * 15;
  const top = 6 + lanes * 1.6 + 4;
  const right = aisleX(aisles) + 5;

  // 主幹道左段: 每 1.7 公尺一個點, 下面接一個待命點
  const bottom: string[] = ["B_L"];
  L.point("B_L", -20, 0);
  for (let k = 0; k < Math.max(n, 1); k++) {
    const x = -18 + k * 1.7;
    L.point(`Q${k}`, x, 0).standby(`SB${k}`, x, -4).path(`Q${k}`, `SB${k}`);
    bottom.push(`Q${k}`);
  }
  for (let i = 0; i < aisles; i++) {
    L.point(`B${i}`, aisleX(i), 0);
    bottom.push(`B${i}`);
  }
  L.point("B_R", right, 0);
  bottom.push("B_R");
  L.chain(bottom);

  for (let i = 0; i < aisles; i++) {
    const x = aisleX(i);
    const ids = [`B${i}`];
    for (let k = 0; k < lanes; k++) {
      const y = 6 + k * 1.6;
      const j = `J${i}_${k}`;
      L.point(j, x, y).station(`A${i}_${k}`, x + 4, y, 25, 25).station(`Z${i}_${k}`, x + 6, y, 25, 25);
      L.chain([j, `A${i}_${k}`, `Z${i}_${k}`]);
      stacks.push(`A${i}_${k}`, `Z${i}_${k}`);
      ids.push(j);
    }
    L.point(`T${i}`, x, top);
    ids.push(`T${i}`);
    L.chain(ids, "one-way");
  }
  L.point("T_R", right, top);
  L.chain([...Array.from({ length: aisles }, (_, i) => `T${i}`), "T_R", "B_R"], "one-way");
  L.station("OUT", right + 6, 0, 20, 20, "pick").path("B_R", "OUT");
  L.station("SHIP", -26, 0, 20, 20, "drop").path("B_L", "SHIP");
  L.group("STACK", stacks);

  return L.input({
    vehicles: [{ count: n, length: 3.1, width: 1.5, speedEmpty: 1.5, speedLoaded: 1.0, accel: 0.4, decel: 0.5, turnSpeed: 30, canReverse: true }],
    demand: [
      { from: "OUT", to: "STACK", perHour: 40 },
      { from: "STACK", to: "SHIP", perHour: 30 },
    ],
    durationH: opts.durationH ?? 8,
    warmupMin: 30,
    seed: opts.seed ?? 1,
  });
}
