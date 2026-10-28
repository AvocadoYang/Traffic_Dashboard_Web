import { describe, expect, it } from "vitest";
import { ALERT_BODY, ALERT_BUMPER, ALERT_FORK, ALERT_SCAN_AROUND, ALERT_SCAN_FRONT, ALERT_SCAN_REAR, alertZones } from "../alerts";

describe("alertZones", () => {
  it("預設告警清單的說明對到部位", () => {
    expect(alertZones(["防撞邊條觸發"])).toBe(ALERT_BUMPER);
    expect(alertZones(["碰撞偵測"])).toBe(ALERT_BUMPER);
    expect(alertZones(["枒杈尖故障"])).toBe(ALERT_FORK);
    expect(alertZones(["枒杈檢測到障礙物"])).toBe(ALERT_FORK);
    expect(alertZones(["擋板偵測位移"])).toBe(ALERT_FORK);
    expect(alertZones(["前方2D光達檢測到障礙物"])).toBe(ALERT_SCAN_FRONT);
    expect(alertZones(["後方2D光達檢測到障礙物"])).toBe(ALERT_SCAN_REAR);
    expect(alertZones(["3D光達檢測到障礙物"])).toBe(ALERT_SCAN_AROUND);
    expect(alertZones(["超聲波檢測到障礙物"])).toBe(ALERT_SCAN_AROUND);
    expect(alertZones(["緊急按鈕已按下"])).toBe(ALERT_BODY);
    expect(alertZones(["低電量(<30%)"])).toBe(ALERT_BODY);
  });

  it("英文說明也認得", () => {
    expect(alertZones(["Bumper strip triggered"])).toBe(ALERT_BUMPER);
    expect(alertZones(["Front 2D LiDAR detected obstacle"])).toBe(ALERT_SCAN_FRONT);
    expect(alertZones(["Fork tip fault"])).toBe(ALERT_FORK);
  });

  it("好幾個告警一起閃, 沒告警是 0", () => {
    expect(alertZones(["防撞邊條觸發", "枒杈尖故障"])).toBe(ALERT_BUMPER | ALERT_FORK);
    expect(alertZones([])).toBe(0);
  });
});
