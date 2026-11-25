import { describe, expect, it, vi } from "vitest";

// useAdvantech 會連 socket, 測純函式用不到
vi.mock("@/sockets/socketConnect", () => ({
  io: { on: vi.fn(), off: vi.fn() },
}));
vi.mock("@/api/axiosClient", () => ({ default: {} }));

import {
  AdvantechGroupRow,
  AdvantechStateRow,
  IoStatusMap,
  describeConditions,
  evaluateGroup,
  groupSignals,
} from "@/api/useAdvantech";

const mod = (id: string) => ({
  id,
  name: id,
  ip: "1.1.1.1",
  groupId: "g",
  groupOrder: 0,
  ioLabels: null,
  createdAt: "",
  updatedAt: "",
});

const state = (
  id: string,
  conditions: AdvantechStateRow["conditions"],
): AdvantechStateRow => ({
  id,
  groupId: "g",
  name: id,
  note: "",
  tone: "blue",
  sortOrder: 0,
  conditions,
});

// 電梯: 模組 a = DO0–3 / DI0–3, 模組 b = DO4–7 / DI4–7
const group = (states: AdvantechStateRow[]): AdvantechGroupRow => ({
  id: "g",
  name: "elevator",
  note: "",
  modules: [mod("a"), mod("b")],
  buttons: [],
  states,
  createdAt: "",
  updatedAt: "",
});

type Io = { di?: boolean[]; do?: boolean[]; connected?: boolean };
const io = (a: Io, b: Io = {}): IoStatusMap =>
  new Map(
    (
      [
        ["a", a],
        ["b", b],
      ] as const
    ).map(([id, s]) => [
      id,
      {
        id,
        connected: s.connected ?? true,
        di: s.di ?? [false, false, false, false],
        do: s.do ?? [false, false, false, false],
        error: "",
      },
    ]),
  );

const on = (moduleId: string, side: "di" | "do", channel: number) => ({
  moduleId,
  side,
  channel,
  on: true,
});

const exclusive = state("exclusive", [on("a", "do", 0), on("a", "do", 1)]);
const floor5 = state("floor5", [on("b", "do", 0)]);
const fault = state("fault", [on("a", "di", 0)]);

describe("groupSignals", () => {
  it("第 2 台模組接續編號", () => {
    const g = group([]);
    expect(groupSignals(g, "do").map((s) => s.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(groupSignals(g, "do")[4]).toMatchObject({
      moduleId: "b",
      channel: 0,
    });
    expect(describeConditions(g, floor5.conditions)).toBe("DO4");
    expect(describeConditions(g, exclusive.conditions)).toBe("DO0 + DO1");
  });
});

describe("evaluateGroup", () => {
  const g = group([exclusive, floor5, fault]);

  it("還沒拿到 IO 狀態就是 loading", () => {
    expect(evaluateGroup(g, undefined).kind).toBe("loading");
  });

  it("有模組離線就不判斷", () => {
    expect(evaluateGroup(g, io({}, { connected: false })).kind).toBe("offline");
  });

  it("組合要同時亮才算", () => {
    const r = evaluateGroup(g, io({ do: [true, false] }));
    expect(r).toEqual({ kind: "ok", active: [] });
  });

  it("好幾個可以同時成立, 照設定順序", () => {
    const r = evaluateGroup(
      g,
      io({ do: [true, true], di: [true] }, { do: [true] }),
    );
    expect(r.kind === "ok" && r.active.map((s) => s.id)).toEqual([
      "exclusive",
      "floor5",
      "fault",
    ]);
  });

  it("模組已經移出群組的那一筆不會成立", () => {
    const stale = state("stale", [on("gone", "di", 0)]);
    const r = evaluateGroup(group([stale]), io({ di: [true] }));
    expect(r).toEqual({ kind: "ok", active: [] });
  });
});
