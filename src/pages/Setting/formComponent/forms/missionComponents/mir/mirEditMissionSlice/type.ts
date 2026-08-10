/**
 * 機器人 的任務格式
 */
export type Mir_Action_Slice = {
  id: string;
  disable: boolean;
  process_order: number;
  operation: Mir_Action;
  scope_reference?: string | null;
};

export type Mir_Action = {
  id: string;
  type: string;
  currentMapId: string;
  scope_reference: string;

  // 位置與導航相關
  location_id?: string;
  entry_position?: string;
  footprint?: string;
  marker_type?: string;

  // 逾時與限制參數
  blocked_path_timeout?: number;
  blocked_docking_timeout?: number;
  maximum_linear_speed?: number;
  maximum_angular_speed?: number;
  distance_threshold?: number;

  // 相對位移參數
  x?: number;
  y?: number;
  orientation?: number;
  collision_detection?: boolean;

  // 時間與聲音相關
  wait?: string;
  sound?: string;
  volume?: number;

  // 安全防護區域
  front?: "muted" | "unmuted" | string;
  rear?: "muted" | "unmuted" | string;
  sides?: "muted" | "unmuted" | string;
  content?: string;
};

export type Mir_Task =
  | "move"
  | "sound/light"
  | "Error Handling"
  | "Safty system";

export const mirMoveActonList = [
  "adjust_localization",
  // "check_position_status",
  "docking",
  "move",
  "move_to_coordinate",
  // "planner_settings",
  "relative_move",
  "set_footprint",
  "switch_map",
] as const;

export const mirSoundLight = [
  "play_sound",
  "stop_sound",
  "show_light",
] as const;

export const mirErrorHandlingList = ["wait"] as const;

export const mirSaftySystemList = ["reduce_protective_fields"] as const;

export type Mir_Move_Action_Type = (typeof mirMoveActonList)[number];
export type Mir_Sound_Light_Type = (typeof mirSoundLight)[number];
export type Mir_Error_Handling_Type = (typeof mirErrorHandlingList)[number];
export type Mir_Safty_System_Type = (typeof mirSaftySystemList)[number];

export type Mir_All_Action =
  | Mir_Move_Action_Type
  | Mir_Sound_Light_Type
  | Mir_Error_Handling_Type
  | Mir_Safty_System_Type;