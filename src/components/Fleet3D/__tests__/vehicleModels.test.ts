import { describe, expect, it, vi } from "vitest";

// 上傳的模型網址照 API 的位址 (axiosClient 一載入就讀 window.location)
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = { location: { origin: "http://localhost:5173" } };
});
import { FORKLIFT_URL, M68_URL, MIR_URL } from "../modelUrls";
import { RobotTypeModelInfo, robotTypeFor, simVehicleModel, vehicleModelFor } from "../vehicleModels";

const type = (patch: Partial<RobotTypeModelInfo>): RobotTypeModelInfo => ({
  id: "t",
  name: "T",
  value: "v",
  length: 0,
  model_3d: null,
  model_3d_yaw: 0,
  model_3d_file: null,
  ...patch,
});

describe("vehicleModels", () => {
  const types = [
    type({ id: "fork", name: "平衡式", value: "anfa-ps14-16", length: 3 }),
    type({ id: "sw", name: "滾筒式", value: "SW15", length: 1.75, model_3d: "m68", model_3d_yaw: 180 }),
    type({ id: "up", name: "上傳的", value: "anfa-cb15-40", length: 2.6, model_3d: "custom", model_3d_yaw: 90, model_3d_file: { updated_at: "2026-10-29T01:02:03.000Z" } }),
  ];

  it("車型: 先比車名前三段, 沒對到再找車名裡有的車型代號 (不分大小寫)", () => {
    expect(robotTypeFor("#anfa-ps14-16-427", types)?.id).toBe("fork");
    expect(robotTypeFor("#SW15-A-003", types)?.id).toBe("sw");
    expect(robotTypeFor("line2-sw15-7", types)?.id).toBe("sw");
    expect(robotTypeFor("#other-1-2-3", types)).toBeUndefined();
  });

  it("車型設定的模型優先, 內建的叉車照原本大小, 其他縮放成車型的長度", () => {
    expect(vehicleModelFor("#anfa-ps14-16-1", types)).toEqual({ kind: "forklift", url: FORKLIFT_URL, yaw: 0, fitLength: undefined });
    expect(vehicleModelFor("#SW15-A-003", types)).toEqual({ kind: "m68", url: M68_URL, yaw: 180, fitLength: 1.75 });
    const custom = vehicleModelFor("#anfa-cb15-40-9", types);
    expect(custom.kind).toBe("custom");
    expect(custom.url).toMatch(/\/api\/setting\/robot-type-model\/up\?v=2026-10-29T01%3A02%3A03.000Z$/);
    expect(custom).toMatchObject({ yaw: 90, fitLength: 2.6 });
  });

  it("沒有車型設定時照車名: mi 是 MiR, sw15 是 M68, 其他是叉車; 選了上傳但檔案不見也一樣", () => {
    expect(vehicleModelFor("mir250-01", undefined).url).toBe(MIR_URL);
    expect(vehicleModelFor("sw15-02", undefined).url).toBe(M68_URL);
    expect(vehicleModelFor("forklift-03", undefined).url).toBe(FORKLIFT_URL);
    expect(vehicleModelFor("#x-y-z-1", [type({ value: "x-y-z", model_3d: "custom" })]).kind).toBe("forklift");
  });

  it("模擬: 車種名稱跟車型的名稱或代號一樣就用那個車型的模型", () => {
    expect(simVehicleModel("滾筒式", types).kind).toBe("m68");
    expect(simVehicleModel("sw15", types).kind).toBe("m68");
    expect(simVehicleModel("V1", types).kind).toBe("forklift");
  });
});
