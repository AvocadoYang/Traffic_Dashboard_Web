/**
 * 執行前檢查: 會讓模擬跑不下去、或跑出錯的結果的設定, 先擋下來 (error); 可能有問題的提醒 (warning).
 * 每一項都帶要去哪一頁改、和相關的點位 / 路線, 畫面上可以直接點過去.
 */
import { buildNet, Net } from "../engine/network";
import { costToGo, estimateFromNode, Profile } from "../engine/routing";
import { toSimInput } from "../engine/runner";
import type { SimDoc } from "./types";

export interface Issue {
  level: "error" | "warning";
  /** 翻譯 key: sim_v2.check.<code> */
  code: string;
  params?: Record<string, string | number>;
  /** 要去哪一頁改 */
  tab: "layout" | "vehicles" | "demand" | "run";
  nodeIds?: string[];
  pathIds?: string[];
}

export function validateDoc(doc: SimDoc): Issue[] {
  const issues: Issue[] = [];
  const vehicles = doc.vehicleTypes.reduce((s, t) => s + t.count, 0);
  const standby = doc.nodes.filter((n) => n.kind === "standby");
  if (vehicles === 0) issues.push({ level: "error", code: "no_vehicles", tab: "vehicles" });
  if (!doc.demand.length) issues.push({ level: "error", code: "no_demand", tab: "demand" });
  if (vehicles > standby.length) {
    issues.push({ level: "error", code: "too_few_standby", params: { standby: standby.length, vehicles }, tab: "layout" });
  }
  if (doc.run.warmupMin * 60 >= doc.run.durationH * 3600) issues.push({ level: "error", code: "warmup_too_long", tab: "run" });

  const net = buildNet(toSimInput(doc));
  const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));
  const groupById = new Map(doc.groups.map((g) => [g.id, g]));
  const type = doc.vehicleTypes.find((t) => t.count > 0) ?? doc.vehicleTypes[0];
  const reach = type ? reachability(net, type, doc.traffic.turnThresholdDeg) : null;
  const nameOf = (i: number) => net.nodes[i].name;

  /** 「從」或「到」指到的站點; 有問題就記下來並回 null */
  const endpoint = (row: number, ref: string, side: "from" | "to"): number[] | null => {
    const need = side === "from" ? "pick" : "drop";
    if (!ref) {
      issues.push({ level: "error", code: `row_no_${side}`, params: { row }, tab: "demand" });
      return null;
    }
    const node = nodeById.get(ref);
    if (node) {
      if (node.kind !== "station") {
        issues.push({ level: "error", code: "row_not_station", params: { row, name: node.name }, tab: "demand", nodeIds: [node.id] });
        return null;
      }
      const bad = need === "pick" ? node.station?.type === "drop" : node.station?.type === "pick";
      if (bad) {
        issues.push({ level: "error", code: `row_${side}_wrong_type`, params: { row, name: node.name }, tab: "demand", nodeIds: [node.id] });
        return null;
      }
      return [net.nodeIndex.get(node.id)!];
    }
    const group = groupById.get(ref);
    if (!group) {
      issues.push({ level: "error", code: `row_missing_${side}`, params: { row }, tab: "demand" });
      return null;
    }
    const members = (net.groups.get(group.id) ?? []).filter((i) => (need === "pick" ? net.nodes[i].canPick : net.nodes[i].canDrop));
    if (!members.length) {
      issues.push({ level: "error", code: `row_group_no_${need}`, params: { row, name: group.name }, tab: "demand" });
      return null;
    }
    return members;
  };

  const sb = standby.map((n) => net.nodeIndex.get(n.id)!);
  const fromStandby = (p: number) => sb.some((x) => reach!(x, p));
  const toStandby = (q: number) => sb.some((x) => reach!(q, x));
  const usedPicks = new Set<number>();
  doc.demand.forEach((d, i) => {
    const row = i + 1;
    const from = endpoint(row, d.from, "from");
    const to = endpoint(row, d.to, "to");
    if (!(d.perHour > 0)) issues.push({ level: "error", code: "row_rate", params: { row }, tab: "demand" });
    if (!from || !to || !reach) return;
    const label = (list: number[], ref: string) => (list.length === 1 ? nameOf(list[0]) : groupById.get(ref)?.name ?? "");
    const ids = (list: number[]) => list.map((x) => net.nodes[x].id);
    // 取貨站要到得了至少一個放貨站、車要從待命點開得到; 放貨站放完要回得了待命點.
    // 群組裡有不行的成員只提醒 (不會派車去), 全部都不行才擋
    const okFrom = from.filter((p) => to.some((q) => reach(p, q)));
    if (!okFrom.length) {
      issues.push({ level: "error", code: "unreachable_pair", params: { row, from: label(from, d.from), to: label(to, d.to) }, tab: "layout", nodeIds: ids([...from, ...to]).slice(0, 40) });
      return;
    }
    const okTo = to.filter((q) => okFrom.some((p) => reach(p, q)));
    const startOk = sb.length ? okFrom.filter(fromStandby) : okFrom;
    const homeOk = sb.length ? okTo.filter(toStandby) : okTo;
    if (!startOk.length) {
      issues.push({ level: "error", code: "pick_unreachable", params: { row, names: okFrom.slice(0, 5).map(nameOf).join("、") }, tab: "layout", nodeIds: ids(okFrom) });
    }
    if (!homeOk.length) {
      issues.push({ level: "error", code: "no_way_home", params: { row, names: okTo.slice(0, 5).map(nameOf).join("、") }, tab: "layout", nodeIds: ids(okTo) });
    }
    const dead = [...from.filter((p) => !startOk.includes(p)), ...to.filter((q) => !homeOk.includes(q))];
    if (dead.length && startOk.length && homeOk.length) {
      issues.push({
        level: "warning",
        code: "unreachable_members",
        params: { row, count: dead.length, names: dead.slice(0, 5).map(nameOf).join("、") },
        tab: "layout",
        nodeIds: ids(dead),
      });
    }
    startOk.forEach((p) => usedPicks.add(p));
  });
  // 待命點開不到任何取貨站: 停在那裡的車不會有工作
  if (reach && sb.length && usedPicks.size) {
    const idle = sb.filter((x) => ![...usedPicks].some((p) => reach(x, p)));
    if (idle.length) {
      issues.push({ level: "warning", code: "standby_isolated", params: { names: idle.slice(0, 5).map(nameOf).join("、") }, tab: "layout", nodeIds: idle.map((x) => net.nodes[x].id) });
    }
  }

  if (net.closePaths.length) {
    issues.push({
      level: "warning",
      code: "close_paths",
      params: { count: net.closePaths.length, width: net.width.toFixed(1) },
      tab: "layout",
      pathIds: net.closePaths.flatMap((c) => [c.a, c.b]),
    });
  }
  return issues;
}

/** a 到不到得了 b (照模擬的找路規則: 不能半路迴轉) */
function reachability(net: Net, type: SimDoc["vehicleTypes"][number], thrDeg: number) {
  const p: Profile = {
    vcap: Math.max(0.05, type.speedEmpty),
    accel: Math.max(0.01, type.accel),
    decel: Math.max(0.01, type.decel),
    turnRate: (Math.max(1, type.turnSpeed) * Math.PI) / 180,
    thr: (Math.max(0, thrDeg) * Math.PI) / 180,
    canReverse: type.canReverse,
  };
  const cache = new Map<number, Float64Array>();
  return (a: number, b: number) => {
    if (a === b) return true;
    let ctg = cache.get(b);
    if (!ctg) {
      ctg = costToGo(net, p, b);
      cache.set(b, ctg);
    }
    return Number.isFinite(estimateFromNode(net, p, ctg, a, 0, b));
  };
}
