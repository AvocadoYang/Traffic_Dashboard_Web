import dayjs from "dayjs";
import type { Mir_Action } from "./type";

export type MirEditableField =
  | "location_id"
  | "entry_position"
  | "footprint"
  | "marker_type"
  | "blocked_path_timeout"
  | "blocked_docking_timeout"
  | "maximum_linear_speed"
  | "maximum_angular_speed"
  | "distance_threshold"
  | "x"
  | "y"
  | "orientation"
  | "collision_detection"
  | "wait"
  | "sound"
  | "volume"
  | "front"
  | "rear"
  | "sides"
  | "module"
  | "port"
  | "value"
  | "operation"
  | "timeout";

const ALL_EDITABLE_FIELDS: readonly MirEditableField[] = [
  "location_id",
  "entry_position",
  "footprint",
  "marker_type",
  "blocked_path_timeout",
  "blocked_docking_timeout",
  "maximum_linear_speed",
  "maximum_angular_speed",
  "distance_threshold",
  "x",
  "y",
  "orientation",
  "collision_detection",
  "wait",
  "sound",
  "volume",
  "front",
  "rear",
  "sides",
  "module",
  "port",
  "value",
  "operation",
  "timeout",
];

export const MIR_ACTION_FIELDS: Record<string, readonly MirEditableField[]> = {
  adjust_localization: [],
  docking: [
    "location_id",
    "marker_type",
    "blocked_path_timeout",
    "blocked_docking_timeout",
    "maximum_linear_speed",
  ],
  move: ["location_id", "blocked_path_timeout", "distance_threshold"],
  move_to_coordinate: [],
  relative_move: [
    "x",
    "y",
    "orientation",
    "maximum_linear_speed",
    "maximum_angular_speed",
    "collision_detection",
    "blocked_path_timeout",
  ],
  set_footprint: ["footprint"],
  switch_map: ["entry_position"],
  play_sound: [],
  stop_sound: [],
  show_light: [],
  wait: ["wait"],
  reduce_protective_fields: ["sound", "volume", "front", "rear", "sides"],
  set_io: ["module", "port", "operation", "timeout"],
  wait_for_io: ["module", "port", "value", "timeout"],
};

const DEFAULTS: Record<MirEditableField, unknown> = {
  location_id: "",
  entry_position: "",
  footprint: "",
  marker_type: null,
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
  module: null,
  port: 0,
  value: "on",
  operation: "on",
  timeout: "00:00:00",
};

const TIME_FIELDS: readonly MirEditableField[] = ["wait", "timeout"];

// 表單上是 dayjs 物件,DB 存的是 "HH:mm:ss" 字串
const toTimeString = (v: unknown) =>
  v && dayjs(v as dayjs.Dayjs).isValid()
    ? dayjs(v as dayjs.Dayjs).format("HH:mm:ss")
    : "00:00:00";

type RawFormValues = Record<string, unknown>;

export const buildMirOperationFields = (
  actionType: string,
  raw: RawFormValues,
  prev?: Partial<Mir_Action> | null,
): Pick<Mir_Action, MirEditableField> => {
  const editable = new Set(MIR_ACTION_FIELDS[actionType] ?? []);

  const out: Record<string, unknown> = {};
  ALL_EDITABLE_FIELDS.forEach((field) => {
    const fromForm =
      editable.has(field) && Object.prototype.hasOwnProperty.call(raw, field);
    const prevValue = prev?.[field];

    if (TIME_FIELDS.includes(field)) {
      out[field] = fromForm
        ? toTimeString(raw[field])
        : (prevValue as string) || DEFAULTS[field];
      return;
    }

    const next = fromForm ? raw[field] : prevValue;
    out[field] = next ?? DEFAULTS[field];
  });

  return out as Pick<Mir_Action, MirEditableField>;
};
