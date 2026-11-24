import { describe, expect, it } from "vitest";
import { batteryLevel, contentView, parseInterval, parseSlides, stepIndex } from "./slides";

describe("kiosk slides", () => {
  it("parses slide names in URL order and falls back to all", () => {
    expect(parseSlides("fleet,map")).toEqual(["fleet", "map"]);
    expect(parseSlides("fleet,fleet,nope")).toEqual(["fleet"]);
    expect(parseSlides("nope")).toEqual(["map", "report", "fleet", "alarms"]);
    expect(parseSlides(null)).toHaveLength(4);
  });
  it("clamps the interval", () => {
    expect(parseInterval(null)).toBe(15);
    expect(parseInterval("abc")).toBe(15);
    expect(parseInterval("-3")).toBe(15);
    expect(parseInterval("1")).toBe(5);
    expect(parseInterval("9999")).toBe(300);
    expect(parseInterval("30")).toBe(30);
  });
  it("wraps around when stepping", () => {
    expect(stepIndex(3, 4, 1)).toBe(0);
    expect(stepIndex(0, 4, -1)).toBe(3);
    expect(stepIndex(0, 0, 1)).toBe(0);
  });
  it("grades battery", () => {
    expect(batteryLevel(undefined)).toBe("unknown");
    expect(batteryLevel(10)).toBe("low");
    expect(batteryLevel(30)).toBe("warn");
    expect(batteryLevel(80)).toBe("ok");
  });
  it("frames the content, not the whole map", () => {
    expect(contentView([], 1.7)).toBeNull();
    const v = contentView([{ x: 0, y: 0 }, { x: 40, y: 20 }], 1.7)!;
    expect(v.tx).toBe(20);
    expect(v.ty).toBe(10);
    expect(v.dy).toBeGreaterThan(0);
    const wide = contentView([{ x: 0, y: 0 }, { x: 80, y: 20 }], 1.7)!;
    expect(wide.dy).toBeGreaterThan(v.dy);
  });
});
