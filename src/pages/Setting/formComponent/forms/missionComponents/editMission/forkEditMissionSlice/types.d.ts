import { YawGenre } from "../mission";
import {
  actonList,
  activeWaitRobot,
  selectLocationOption,
  yawOption,
  forkHeightOption,
  waitRobotOption,
} from "./params";

export type Fork_Movement = {
  tilt?: number; //-6~+6 deg
  clamp?: number; // 0-900mm

  fork_height?: {
    is_define_height?: string; // custom select
    height?: number;
  };

  pallet_detection?: {
    modify_dis?: number; //float
    blind?: boolean; //true: 需要提供goal
    goal?: number; //int
  };

  baffle?: number;

  shelf_detection?: {
    tx?: number; //float
    X_VALID_RANGE?: number; //float
    Y_VALID_RANGE?: number; //float
  };

  blind_fork?: {
    backward_location_id?: string;
    forward_location_id?: string;
  };

  liftctrl?: {
    lift?: string;
  };
};

export type Fork_Action = {
  id?: string;
  process_order?: number;
  operation: {
    type: string;
    control: Array<string>;
    wait: number;
    is_define_id: Select_Location_Type;
    locationId: number;
    is_define_yaw: YawGenre;
    yaw: number;
    tolerance: number;
    lookahead: number;

    waitOtherAmr: string | null;
    waitGenre: string | null;
    auto_preparatory_point: boolean;
  };
  io: {
    fork: {
      [control_index: number]: Fork_Movement;
    };
    fork_global: {
      level: number;
      is_define_level: string;
    };
    camera: {
      config: number;
      modify_dis: number;
    };
  };
  cargo_limit: {
    load: number;
    offload: number;
  };
  mission_status: {
    feedback_id: string;
    name: string[]; //任務全名
    category: string[]; //任務標籤
    start: string; // 自定義的起始load 地點名稱
    end: string; // 自定義的起始offload 地點名稱
    originalStart: string; // 起始load 地點名稱
    originalEnd: string; //起始offload 地點名稱
    bookBlock: string[] | null;
    load_level?: number | null;
    offload_level?: number | null;
    cargo?: any | null;
  };
};

export type Action_Type = (typeof actonList)[number];

export type Select_Location_Type = (typeof selectLocationOption)[number];

export type Select_Yaw_Type = (typeof yawOption)[number];

export type Select_Fork_Height_Type = (typeof forkHeightOption)[number];

export type Select_Active_Robot_Type = (typeof activeWaitRobot)[number];

export type Select_Robot_Wait_Type = (typeof waitRobotOption)[number];

export type Control_Types = "F" | "H" | "S" | "B" | "W" | "clamp" | "tilt";
