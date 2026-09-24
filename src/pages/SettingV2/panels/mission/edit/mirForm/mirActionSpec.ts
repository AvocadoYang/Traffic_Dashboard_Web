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
  option: "free",
  wait: "00:00:00",
  sound: "",
  volume: 0,
  mode: "full",
  duration: "00:00:01.000000",
  light_effect: "solid",
  speed: "slow",
  color_1: "#ffffff",
  color_2: "#ffffff",
  intensity: 100,
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

/**
 * 選項要從哪個 API 來。
 * sounds 與 ioModules 是「即時向車上問」的清單(車上隨時會被上傳/刪除音檔、
 * 插拔 IO 模組),沒有車在線時會是空的,所以下拉要另外給提示,見 MirParamDrawer。
 */
export type OptionSource = "locations" | "footprints" | "sounds" | "ioModules";

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
  /** 跟 time 一樣用 TimePicker,但 MiR 的 duration 要帶微秒:"HH:mm:ss.000000" */
  | (Base & { kind: "duration" })
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

/** check_pose:要求該位置必須是空的還是有東西,檢查才算通過 */
const POSE_OPTION_OPTIONS = [
  { label: "FREE", value: "free" },
  { label: "OCCUPIED", value: "occupied" },
];

/** sound:Full 播完整個音檔,Custom 只播到下面設定的長度 */
const SOUND_MODE_OPTIONS = [
  { label: "FULL", value: "full" },
  { label: "CUSTOM", value: "custom" },
];

const LIGHT_EFFECT_OPTIONS = [
  { label: "BLINK", value: "blink" },
  { label: "CANCEL", value: "cancel" },
  { label: "CHASE", value: "chase" },
  { label: "FADE", value: "fade" },
  { label: "RAINBOW", value: "rainbow" },
  { label: "SOLID", value: "solid" },
  { label: "WAVE", value: "wave" },
];

const LIGHT_SPEED_OPTIONS = [
  { label: "FAST", value: "fast" },
  { label: "SLOW", value: "slow" },
];

/** MiR 收的是色碼字串,不是色名,所以 value 要維持 hex */
const LIGHT_COLOR_OPTIONS = [
  { label: "BLACK", value: "#000000" },
  { label: "BLUE", value: "#0000ff" },
  { label: "CYAN", value: "#00ffff" },
  { label: "GREEN", value: "#008000" },
  { label: "MAGENTA", value: "#ff00ff" },
  { label: "ORANGE", value: "#ffa500" },
  { label: "PINK", value: "#ffc0cb" },
  { label: "RED", value: "#ff0000" },
  { label: "WHITE", value: "#ffffff" },
  { label: "YELLOW", value: "#ffff00" },
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
 * 動作 -> 參數欄位。沒列到的動作(adjust_localization / sound_stop)
 * 本來就沒有參數可以設。
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
    {
      kind: "switch",
      name: "collision_detection",
      label: "Collision detection",
    },
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

  // dev 把動作改名了:play_sound -> sound、stop_sound -> sound_stop、
  // show_light -> light,而且 sound 多了 mode / duration。
  // sound_stop 本來就沒有參數,所以不列。
  sound: [
    {
      kind: "optionSelect",
      name: "sound",
      label: "Sound",
      source: "sounds",
      hint: "清單是即時向線上的 MiR 車輛查來的,不是本地資料庫那一份。",
    },
    {
      kind: "number",
      name: "volume",
      label: "Volume",
      min: 0,
      max: 100,
      hint: "100% 大約是 80 dB。",
    },
    {
      kind: "select",
      name: "mode",
      label: "Mode",
      options: SOUND_MODE_OPTIONS,
    },
    {
      kind: "duration",
      name: "duration",
      label: "Duration",
      hint: "只有 Mode 選 Custom 時才有作用,最小單位是秒。",
    },
  ],

  light: [
    {
      kind: "select",
      name: "light_effect",
      label: "Light effect",
      options: LIGHT_EFFECT_OPTIONS,
    },
    {
      kind: "select",
      name: "speed",
      label: "Speed",
      options: LIGHT_SPEED_OPTIONS,
    },
    {
      kind: "select",
      name: "color_1",
      label: "Color 1",
      options: LIGHT_COLOR_OPTIONS,
    },
    {
      kind: "select",
      name: "color_2",
      label: "Color 2",
      options: LIGHT_COLOR_OPTIONS,
    },
    {
      kind: "number",
      name: "intensity",
      label: "Intensity",
      min: 0,
      max: 100,
      hint: "燈光亮度,0-100。",
    },
    { kind: "time", name: "timeout", label: "Timeout" },
  ],

  check_pose: [
    // 這裡用單純的點位下拉,不是 docking/move 那個 kind: "location"——
    // 那顆會連帶帶出「Current position」開關,而開關是跟 marker_type 互斥的,
    // check_pose 根本沒有 marker_type 這個欄位。
    {
      kind: "optionSelect",
      name: "location_id",
      label: "Position",
      source: "locations",
    },
    ...coordinateFields,
    {
      kind: "select",
      name: "option",
      label: "Option",
      options: POSE_OPTION_OPTIONS,
      hint: "要求該位置是空的(Free)還是有東西(Occupied),檢查才算通過。",
    },
    { kind: "time", name: "timeout", label: "Timeout" },
  ],

  // 降低防護區時會放警示音,所以 sound / volume 也是這個動作的參數,
  // 跟 sound 動作自己的那一組是分開的兩份設定。
  [CONTAINER_TYPE]: [
    {
      kind: "optionSelect",
      name: "sound",
      label: "Sound",
      source: "sounds",
      hint: "降低防護區期間要播的警示音。",
    },
    {
      kind: "number",
      name: "volume",
      label: "Volume",
      min: 0,
      max: 100,
    },
    { kind: "select", name: "front", label: "Front", options: MUTE_OPTIONS },
    { kind: "select", name: "rear", label: "Rear", options: MUTE_OPTIONS },
    { kind: "select", name: "sides", label: "Sides", options: MUTE_OPTIONS },
  ],

  set_io: [
    {
      kind: "optionSelect",
      name: "module",
      label: "Module",
      source: "ioModules",
      hint: "清單是即時向線上的 MiR 車輛查來的。",
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
      kind: "optionSelect",
      name: "module",
      label: "Module",
      source: "ioModules",
      hint: "清單是即時向線上的 MiR 車輛查來的。",
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
    case "sound":
      return { verb: "Play sound", chip: op.sound || "-" };
    case "sound_stop":
      return { verb: "Stop sound" };
    case "light":
      return {
        verb: `Show light ${op.light_effect ?? "solid"}`,
        chip: op.color_1 || undefined,
      };
    case "check_pose":
      return {
        verb: `Check pose is ${op.option ?? "free"}`,
        chip: op.location_id || "-",
      };
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
