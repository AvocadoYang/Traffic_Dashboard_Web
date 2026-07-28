/**
 * 機器人 的任務格式
 */
export type Mir_Action = {
  id: string;
  operation: {
    locationId: number;
    type: string;
  };
};

export type Mir_Action_Slice = {
  id: string;
  disable: boolean;
  process_order: number;
  operation: {
    locationId: number;
    type: string;
  };
};


export type Mir_Task = "move" | "sound/light"

export const mirMoveActonList = [
  "Adjust localization",
  "Check position status",
  "Docking",
  "Move",
  "Move to coordinate",
  "Planner settings",
  "Relative move",
  "Set footprint",
  "Switch map",
] as const;

export const mirSoundLight = [
    "Play sound",
    "Stop sound",
    "Show light"
] as const

export type Mir_Move_Action_Type = (typeof mirMoveActonList)[number];
export type Mir_Sound_light_type = (typeof mirSoundLight)[number]

export type Mir_All_Action = Mir_Move_Action_Type | Mir_Sound_light_type