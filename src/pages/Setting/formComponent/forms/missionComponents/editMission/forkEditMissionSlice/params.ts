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
  move: ["F", "fork_height", "B", "W", "NS"],
  load: [
    "C",
    "B",
    "tilt", //
    "clamp", //
    "fork_height", //
    "blind_fork", //
    "pallet_detection", //
    "baffle", //
    "shelf_detection",
  ],
  offload: [
    "B",
    "tilt",
    "clamp",
    "blind_fork",
    "fork_height",
    "pallet_detection",
    "baffle",
    "shelf_detection",
  ],
  spin: ["S"],
  fork: [
    "tilt",
    "clamp",
    "fork_height",
    "blind_fork",
    "pallet_detection",
    "baffle",
    "shelf_detection",
    "QR",
  ],
  charge: ["fork_height"],
  cargo_limit: ["fork_height"],
  load_from_other: ["F", "fork_height", "B", "W"],
  offload_from_other: ["F", "fork_height", "B", "W"],
  verity_cargo: ["C"],
} as const;

export const selectLocationOption = [
  "custom", // 自訂位置
  "select", // 快速任務 user直接指定或是在發任務時計算任務點
  "available_charge_station",
  "prepare_point",
  "back_to_load_place",
] as const;

export const levelOption = ["custom", "select"] as const;

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
