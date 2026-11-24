import { describe, expect, it } from "vitest";
import { missionReplayLink, parseReplayParams, REPLAY_PAD_MS } from "./replayLink";

const NOW = Date.parse("2026-11-20T10:00:00Z");

describe("missionReplayLink", () => {
  it("covers start-30s to end+30s and carries the vehicle", () => {
    const link = missionReplayLink({ amrId: "A1", startedAt: "2026-11-20T09:00:00Z", completedAt: "2026-11-20T09:10:00Z" }, NOW)!;
    const q = new URL(link, "http://x").searchParams;
    expect(link.startsWith("/fleet-replay?")).toBe(true);
    expect(Number(q.get("from"))).toBe(Date.parse("2026-11-20T09:00:00Z") - REPLAY_PAD_MS);
    expect(Number(q.get("to"))).toBe(Date.parse("2026-11-20T09:10:00Z") + REPLAY_PAD_MS);
    expect(q.get("amr")).toBe("A1");
  });
  it("runs to now for a running mission, never into the future", () => {
    const q = new URL(missionReplayLink({ amrId: "A1", startedAt: "2026-11-20T09:59:50Z" }, NOW)!, "http://x").searchParams;
    expect(Number(q.get("to"))).toBe(NOW);
  });
  it("falls back to createdAt and returns null with no vehicle or no time", () => {
    expect(missionReplayLink({ amrId: "A1", createdAt: "2026-11-20T09:00:00Z" }, NOW)).not.toBeNull();
    expect(missionReplayLink({ amrId: "", startedAt: "2026-11-20T09:00:00Z" }, NOW)).toBeNull();
    expect(missionReplayLink({ amrId: "A1" }, NOW)).toBeNull();
  });
});

describe("parseReplayParams", () => {
  it("accepts a valid range and rejects garbage", () => {
    expect(parseReplayParams(new URLSearchParams("from=100&to=200&amr=A1"))).toEqual({ from: 100, to: 200, amr: "A1" });
    expect(parseReplayParams(new URLSearchParams("from=100&to=200"))?.amr).toBeNull();
    expect(parseReplayParams(new URLSearchParams("from=200&to=100"))).toBeNull();
    expect(parseReplayParams(new URLSearchParams("from=abc&to=1"))).toBeNull();
    expect(parseReplayParams(new URLSearchParams(""))).toBeNull();
  });
});
