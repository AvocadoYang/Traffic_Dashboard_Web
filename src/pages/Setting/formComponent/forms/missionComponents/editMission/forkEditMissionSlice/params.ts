export const actonList = [
  "move",
  "load",
  "offload",
  "spin",
  "fork",
  "charge",
  "cargo_limit",
  // "load_from_other",
  // "offload_from_other",
  "verity_cargo",
] as const;

export const controlList = {
  move: ["F", "H", "B", "W"],
  load: ["H", "C", "B", "tilt", "clamp"],
  offload: ["H", "B", "tilt", "clamp"],
  spin: ["S"],
  fork: ["H", "tilt", "clamp"],
  charge: ["H"],
  cargo_limit: ["H"],
  load_from_other: ["F", "H", "S", "B", "W"],
  offload_from_other: ["F", "H", "S", "B", "W"],
  verity_cargo: ["C"],
} as const;

export const selectLocationOption = [
  "custom", // 自訂位置
  "select", // 快速任務 user直接指定或是在發任務時計算任務點
  "available_charge_station",
  "prepare_point",
  "back_to_load_place",
] as const;

export const yawOption = [
  "custom",
  "select",
  "calculate_by_agv_and_shelf_angle",
] as const;

export const forkHeightOption = [
  "default",
  "custom",
  "select",
  "level",
] as const;

export const activeWaitRobot = ["disable", "enable"] as const;

export const waitRobotOption = ["execute_first", "wait_other_finish"] as const;
