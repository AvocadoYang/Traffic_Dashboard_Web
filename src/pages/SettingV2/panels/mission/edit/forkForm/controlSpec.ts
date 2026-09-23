/**
 * 每個控制項底下有哪些參數欄位。
 *
 * v1 的 DynamicControlFields 是一個 600 行的 switch,每個 case 都把
 * 一整段 Form.Item 的 JSX 抄一遍。這裡改成純資料,由 ControlParamFields
 * 負責畫;要加一個控制項只要在這張表加一筆。
 */

/** 欄位路徑是相對於 io.fork.<控制項序號> 的 */
type Path = string[];

type Common = {
  path: Path;
  label: string;
  required?: boolean;
  /** 只有同一個控制項裡某個欄位是特定值時才顯示 */
  showWhen?: { path: Path; values: string[]; orPrefix?: string };
  /** 欄位下方的補充說明。字串會被當成 i18n key */
  extraKey?: string;
};

export type NumberField = Common & {
  kind: "number";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  /** 有給就在欄位下面附一行範圍提示 */
  rangeNote?: string;
};

export type SwitchField = Common & { kind: "switch" };

export type LocationField = Common & { kind: "location" };

export type SegmentField = Common & {
  kind: "segment";
  options: { label: string; value: string }[];
};

/**
 * 兩個地點欄位只能選一個(盲取的前 / 後點位)。
 * 這是唯一需要跨欄位連動的情況,所以給它一個自己的種類。
 */
export type ExclusiveLocationsField = {
  kind: "exclusive-locations";
  label: string;
  note: string;
  first: { path: Path; label: string };
  second: { path: Path; label: string };
};

export type ControlField =
  | NumberField
  | SwitchField
  | LocationField
  | SegmentField
  | ExclusiveLocationsField;

const FORK_HEIGHT_MODE: Path = ["fork_height", "is_define_height"];
const CLAMP_MODE: Path = ["clamp", "is_define_clamp"];

/**
 * 控制項 -> 欄位。沒列在這裡的控制項(F / B / S / W / C / NS / QR)
 * 只影響動作順序,沒有參數要填。
 */
export const CONTROL_FIELDS: Record<string, ControlField[]> = {
  tilt: [
    {
      kind: "number",
      path: ["tilt"],
      label: "TILT ANGLE",
      unit: "°",
      min: -6,
      max: 6,
      step: 0.1,
      required: true,
      rangeNote: "-6.0° ~ +6.0°",
    },
  ],

  pallet_detection: [
    {
      kind: "number",
      path: ["pallet_detection", "modify_dis"],
      label: "MODIFY DISTANCE",
      unit: "mm",
      step: 0.1,
      required: true,
    },
    {
      kind: "switch",
      path: ["pallet_detection", "blind"],
      label: "BLIND MODE",
    },
    {
      kind: "number",
      path: ["pallet_detection", "goal"],
      label: "GOAL HEIGHT",
      unit: "mm",
      min: 0,
      required: true,
    },
  ],

  shelf_detection: [
    {
      kind: "number",
      path: ["shelf_detection", "tx"],
      label: "TX",
      unit: "mm",
      min: 0,
      step: 0.1,
      required: true,
    },
    {
      kind: "number",
      path: ["shelf_detection", "X_VALID_RANGE"],
      label: "X VALID RANGE",
      unit: "mm",
      min: 0,
      required: true,
    },
    {
      kind: "number",
      path: ["shelf_detection", "Y_VALID_RANGE"],
      label: "Y VALID RANGE",
      unit: "mm",
      min: 0,
      required: true,
    },
  ],

  fork_height: [
    {
      kind: "segment",
      path: FORK_HEIGHT_MODE,
      label: "HEIGHT MODE",
      required: true,
      options: [
        { label: "CUSTOM", value: "custom" },
        { label: "LEVEL", value: "level" },
        { label: "SELECT", value: "select" },
        { label: "STACK", value: "stack" },
        { label: "STACK ADD", value: "stack_add" },
      ],
    },
    {
      kind: "number",
      path: ["fork_height", "height"],
      label: "HEIGHT",
      unit: "mm",
      min: 0,
      required: true,
      extraKey: "mission.task_form_fork.custom_extra",
      showWhen: { path: FORK_HEIGHT_MODE, values: ["custom"], orPrefix: "preset" },
    },
    {
      kind: "number",
      path: ["fork_height", "add_height"],
      label: "OFFSET",
      unit: "mm",
      min: 0,
      required: true,
      extraKey: "mission.task_form_fork.stack_add_extra",
      // v1 這一段的條件是 stack_add || startsWith("preset"),但 preset
      // 早就被上面那個欄位的條件接走了,永遠進不來,所以只留 stack_add。
      showWhen: { path: FORK_HEIGHT_MODE, values: ["stack_add"] },
    },
  ],

  blind_fork: [
    {
      kind: "exclusive-locations",
      label: "BLIND FORK",
      note: "前點位與後點位只能選一個。",
      first: { path: ["blind_fork", "backward_location_id"], label: "BACKWARD" },
      second: { path: ["blind_fork", "forward_location_id"], label: "FORWARD" },
    },
  ],

  clamp: [
    {
      kind: "segment",
      path: CLAMP_MODE,
      label: "CLAMP MODE",
      required: true,
      options: [
        { label: "CUSTOM", value: "custom" },
        { label: "SELECT", value: "select" },
      ],
    },
    {
      kind: "number",
      path: ["clamp", "height"],
      label: "CLAMP HEIGHT",
      unit: "mm",
      min: 0,
      required: true,
      showWhen: { path: CLAMP_MODE, values: ["custom"], orPrefix: "preset" },
    },
    // v1 這裡還有一段 clampType === "level" 的分支,但選項只有 custom /
    // select,選不到那個值;而且它的 name 是 ["clamp"],存下去會把整個
    // clamp 物件換成一個數字,把 is_define_clamp 一起蓋掉。不搬過來。
  ],

  baffle: [
    {
      kind: "number",
      path: ["baffle"],
      label: "BAFFLE",
      unit: "mm",
      min: 1,
      required: true,
    },
  ],

  fork_shift: [
    {
      kind: "number",
      path: ["fork_shift"],
      label: "FORK SHIFT",
      unit: "mm",
      min: 1,
      required: true,
    },
  ],

  straight_backward: [
    {
      kind: "location",
      path: ["straight_backward"],
      label: "STRAIGHT BACKWARD",
      required: true,
    },
  ],

  rotate: [
    { kind: "number", path: ["rotate"], label: "ROTATE", required: true },
  ],

  check_cargo_height: [
    {
      kind: "number",
      path: ["check_cargo_height"],
      label: "CHECK CARGO HEIGHT",
      required: true,
    },
  ],
};

/** 控制項本身的顯示名稱。沒列到的就直接用代號大寫。 */
const CONTROL_LABELS: Record<string, string> = {
  F: "FORWARD",
  B: "BACKWARD",
  S: "SPIN",
  W: "WAIT",
  C: "CAMERA",
  NS: "NO STOP",
  QR: "QR",
  tilt: "TILT",
  clamp: "CLAMP",
  baffle: "BAFFLE",
  rotate: "ROTATE",
  fork_shift: "FORK SHIFT",
  fork_height: "FORK HEIGHT",
  blind_fork: "BLIND FORK",
  pallet_detection: "PALLET DETECTION",
  shelf_detection: "SHELF DETECTION",
  straight_backward: "STRAIGHT BACKWARD",
  check_cargo_height: "CHECK CARGO HEIGHT",
};

export const controlLabel = (control: string): string =>
  CONTROL_LABELS[control] ?? control.replace(/_/g, " ").toUpperCase();

/** 這個控制項有沒有參數要填 */
export const hasControlFields = (control: string): boolean =>
  (CONTROL_FIELDS[control]?.length ?? 0) > 0;
