import {
  Mir_Action,
  mirErrorHandlingList,
  mirIoModule,
  mirMoveActonList,
  mirSaftySystemList,
  mirSoundLight,
} from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/type";

/** 唯一可以把別的動作包在裡面的動作 */
export const CONTAINER_TYPE = "reduce_protective_fields";

export const isContainerOperation = (op?: Mir_Action | null) =>
  op?.type === CONTAINER_TYPE;

export const ACTION_CATEGORIES: {
  label: string;
  value: string;
  actions: readonly string[];
}[] = [
  { label: "Move", value: "move", actions: mirMoveActonList },
  { label: "Sound / Light", value: "sound/light", actions: mirSoundLight },
  { label: "Error Handling", value: "error", actions: mirErrorHandlingList },
  { label: "IO Module", value: "io", actions: mirIoModule },
  { label: "Safety System", value: "safety", actions: mirSaftySystemList },
];

/** 跟 missionDefaultValue.ts 的 defaultMirAction() 同一套預設值 */
export const buildDefaultOperation = (type: string): Mir_Action => ({
  id: "",
  currentMapId: "",
  type,
  scope_reference: "",
  location_id: "",
  entry_position: "",
  footprint: "",
  marker_type: "",
  blocked_path_timeout: 60,
  blocked_docking_timeout: 60,
  maximum_linear_speed: 0.25,
  maximum_angular_speed: 0.25,
  distance_threshold: 0.25,
  x: 0,
  y: 0,
  orientation: 0,
  collision_detection: true,
  wait: "00:00:00",
  sound: "",
  volume: 0,
  front: "unmuted",
  rear: "unmuted",
  sides: "unmuted",
  content: "",
  module: "",
  port: 0,
  value: "on",
  operation: "on",
  timeout: "00:00:00",
  variables: {},
});

/* ------------------------------------------------------------------ */
/*  參數欄位                                                           */
/* ------------------------------------------------------------------ */

/** 選項要從哪個 API 來 */
export type OptionSource = "locations" | "footprints" | "sounds";

type Base = {
  name: string;
  label: string;
  hint?: string;
  /**
   * docking 的欄位會看「Current position」開關決定顯示哪些。
   * 沒寫就是一直顯示。
   */
  visible?: "currentPosition" | "notCurrentPosition";
};

export type MirField =
  | (Base & { kind: "number"; step?: number; min?: number; max?: number })
  | (Base & { kind: "switch" })
  | (Base & { kind: "select"; options: { label: string; value: string }[] })
  | (Base & { kind: "optionSelect"; source: OptionSource })
  | (Base & { kind: "time" })
  /** location_id 和「Current position」開關綁在一起,要跨欄位驗證 */
  | { kind: "location"; name: "location_id"; label: string }
  /** 只有 Current position 開啟時才要填,同樣是跨欄位驗證 */
  | { kind: "markerType"; name: "marker_type"; label: string };

const MUTE_OPTIONS = [
  { label: "UNMUTED", value: "unmuted" },
  { label: "MUTED", value: "muted" },
];

const ON_OFF_OPTIONS = [
  { label: "ON", value: "on" },
  { label: "OFF", value: "off" },
];

const IO_MODULE_OPTIONS = [
  {
    label: "MiR Internal IOs",
    value: "mirconst-guid-0000-0001-internalIO00",
  },
];

const blockedPathTimeout: MirField = {
  kind: "number",
  name: "blocked_path_timeout",
  label: "Blocked path timeout",
  min: 0,
};
const blockedDockingTimeout: MirField = {
  kind: "number",
  name: "blocked_docking_timeout",
  label: "Blocked docking timeout",
  min: 0,
};
const maxLinearSpeed: MirField = {
  kind: "number",
  name: "maximum_linear_speed",
  label: "Maximum linear speed",
  step: 0.05,
  min: 0,
};
const maxAngularSpeed: MirField = {
  kind: "number",
  name: "maximum_angular_speed",
  label: "Maximum angular speed",
  step: 0.05,
  min: 0,
};
const coordinateFields: MirField[] = [
  { kind: "number", name: "x", label: "X", step: 0.1 },
  { kind: "number", name: "y", label: "Y", step: 0.1 },
  { kind: "number", name: "orientation", label: "Orientation", step: 1 },
];

/**
 * 動作 -> 參數欄位。沒列到的動作(adjust_localization / stop_sound /
 * show_light)本來就沒有參數可以設。
 */
export const ACTION_FIELDS: Record<string, MirField[]> = {
  docking: [
    { kind: "location", name: "location_id", label: "Marker position" },
    {
      kind: "markerType",
      name: "marker_type",
      label: "Marker type",
    },
    { ...blockedPathTimeout, visible: "notCurrentPosition" },
    blockedDockingTimeout,
    maxLinearSpeed,
  ],

  move: [
    { kind: "location", name: "location_id", label: "Marker position" },
    blockedPathTimeout,
    {
      kind: "number",
      name: "distance_threshold",
      label: "Distance threshold",
      step: 0.05,
      min: 0,
    },
  ],

  relative_move: [
    ...coordinateFields,
    maxLinearSpeed,
    maxAngularSpeed,
    { kind: "switch", name: "collision_detection", label: "Collision detection" },
    blockedPathTimeout,
  ],

  // v1 沒有給 move_to_coordinate 任何欄位,但卡片上的摘要會顯示 X / Y /
  // Orientation,等於加了一張永遠改不了的卡。這裡補上。
  move_to_coordinate: [...coordinateFields, maxLinearSpeed, maxAngularSpeed],

  set_footprint: [
    {
      kind: "optionSelect",
      name: "footprint",
      label: "Set footprint",
      source: "footprints",
    },
  ],

  switch_map: [
    {
      kind: "optionSelect",
      name: "entry_position",
      label: "Entry position",
      source: "locations",
    },
  ],

  wait: [
    {
      kind: "time",
      name: "wait",
      label: "Wait",
      hint: "車輛在這裡等多久才繼續下一個動作。",
    },
  ],

  // v1 把 sound / volume 放在 reduce_protective_fields 底下,play_sound
  // 反而一個欄位都沒有,等於選不到要播的音效。這裡對調回來。
  play_sound: [
    {
      kind: "optionSelect",
      name: "sound",
      label: "Sound",
      source: "sounds",
      hint: "音效清單在「MIR / 聲音」裡維護。",
    },
    {
      kind: "number",
      name: "volume",
      label: "Volume",
      min: 0,
      max: 100,
      hint: "100% 大約是 80 dB。",
    },
  ],

  [CONTAINER_TYPE]: [
    { kind: "select", name: "front", label: "Front", options: MUTE_OPTIONS },
    { kind: "select", name: "rear", label: "Rear", options: MUTE_OPTIONS },
    { kind: "select", name: "sides", label: "Sides", options: MUTE_OPTIONS },
  ],

  set_io: [
    {
      kind: "select",
      name: "module",
      label: "Module",
      options: IO_MODULE_OPTIONS,
    },
    {
      kind: "number",
      name: "port",
      label: "Port",
      min: 1,
      max: 4,
      hint: "要啟動哪一個輸出埠的繼電器(1-4)。",
    },
    {
      kind: "select",
      name: "operation",
      label: "Operation",
      options: ON_OFF_OPTIONS,
    },
    {
      kind: "time",
      name: "timeout",
      label: "Timeout",
      hint: "繼電器要維持多久。",
    },
  ],

  wait_for_io: [
    {
      kind: "select",
      name: "module",
      label: "Module",
      options: IO_MODULE_OPTIONS,
    },
    { kind: "number", name: "port", label: "Port", min: 1, max: 4 },
    {
      kind: "select",
      name: "value",
      label: "Value",
      options: ON_OFF_OPTIONS,
    },
    { kind: "time", name: "timeout", label: "Timeout" },
  ],
};

/** 卡片上那一行摘要 */
export const summarizeAction = (
  op: Mir_Action,
): { verb: string; chip?: string } => {
  switch (op.type) {
    case "move":
      return { verb: "Move to", chip: op.location_id || "-" };
    case "docking":
      return { verb: "Dock to", chip: op.location_id || "-" };
    case "relative_move":
      return {
        verb: `Move X:${op.x ?? 0} Y:${op.y ?? 0} Orientation:${op.orientation ?? 0}`,
      };
    case "move_to_coordinate":
      return {
        verb: `Move to X:${op.x ?? 0} Y:${op.y ?? 0} Orientation:${op.orientation ?? 0}`,
      };
    case "set_footprint":
      return { verb: "Set footprint to", chip: op.footprint || "-" };
    case "switch_map":
      return { verb: "Switch map" };
    case "adjust_localization":
      return { verb: "Adjust localization" };
    case "wait":
      return { verb: `Wait ${op.wait || "00:00:00"}` };
    case "play_sound":
      return { verb: "Play sound", chip: op.sound || "-" };
    case "stop_sound":
      return { verb: "Stop sound" };
    case "show_light":
      return { verb: "Show light" };
    case CONTAINER_TYPE:
      return { verb: "Mute protective fields" };
    case "set_io":
      return {
        verb: `Set IO ${op.module ?? ""} port ${op.port ?? 0} to ${op.value ?? ""}`,
      };
    case "wait_for_io":
      return { verb: `Wait for IO ${op.module ?? ""} port ${op.port ?? 0}` };
    default:
      return { verb: op.type || "Unknown action" };
  }
};
