import {
  actonList,
  activeWaitRobot,
  selectLocationOption,
  yawOption,
  forkHeightOption,
  waitRobotOption,
} from "./params";

export type Fork_Action = {
  operation: {
    type: string;
    control: Array<string>;
    wait: number;
    is_define_id: string;
    locationId: number;
    is_define_yaw: YawGenre;
    yaw: number;
    tolerance: number;
    lookahead: number;

    waitOtherAmr: string;
    waitGenre: string;
    auto_preparatory_point: boolean;
  };
  io: {
    fork: {
      is_define_height: string;
      height: number;
      move: number;
      shift: number;
      tilt: number;
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
    name: string[];
    start: string;
    end: string;
    bookBlock: string[] | null;
  };
};

export type Action_Type = (typeof actonList)[number];

export type Select_Location_Type = (typeof selectLocationOption)[number];

export type Select_Yaw_Type = (typeof yawOption)[number];

export type Select_Fork_Height_Type = (typeof forkHeightOption)[number];

export type Select_Active_Robot_Type = (typeof activeWaitRobot)[number];

export type Select_Robot_Wait_Type = (typeof waitRobotOption)[number];

export type Control_Types = "F" | "H" | "S" | "B" | "W";
