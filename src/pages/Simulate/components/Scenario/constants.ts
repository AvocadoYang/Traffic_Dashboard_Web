/**
 * 對應後端 `MissionPriority` (src/types/manager.ts)。
 * 數值必須跟後端一致 —— 之前這裡各寫各的, 使用者選「LOW」其實送出的是 NORMAL。
 * FLEET_INSERT(4) / ELEVATOR(5) 是交管與電梯內部用的, 不開放給使用者選。
 */
export const PRIORITY_OPTIONS = [
  { label: "TRIVIAL", value: 0 },
  { label: "NORMAL", value: 1 },
  { label: "PIVOTAL", value: 2 },
  { label: "CRITICAL", value: 3 },
];

export const DEFAULT_PRIORITY = 1;
