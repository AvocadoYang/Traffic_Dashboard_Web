import { WriteAction } from "~/configs/dispatcher";

export interface MissionListType {
  key: string;
  name: string;
  robot_type_id: string;
  category: string[];
}

// todo 待修相關使用 這是舊的
type Actions = {
  actions: DataType | undefined;
};

export interface MissionAddType {
  id: string;
  name: string;

  createdAt: Date;
  Car: {
    id: string;
    name: string;
    value: string;
  };
  action: Array<Actions>;
}

export interface EmitActions {
  operation: {
    type?: string;
    control?: string[];
    wait: number;
    is_define_id: string;
    id: number;
    is_define_yaw: number;
    yaw: number;
    tolerance: number;
    lookahead: number;

    waitOtherAmr: string | null;
    waitGenre: string | null;
    auto_preparatory_point: boolean;
  };
  io: {
    fork: {
      is_define_height: string;
      height: number;
      move?: number;
      shift?: number;
      tilt?: number;
    };
    camera: {
      config?: number;
      modify_dis?: number;
    };
  };
}

export interface Fork_mission_Slice {
  id: string;
  disable: boolean;
  process_order: number;
  operation: {
    type: string;
    control: string[];
    wait: number;
    is_define_id: string;
    locationId: number;
    is_define_yaw: number;
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
}

export type Robot_Mission_Slice = {
  id: string;
  process_order: number;
  disable: boolean;
  operation: {
    locationId: number;
    type: string[];
    control: string[];
    param: { [key: string]: number }[];
  };
};

export type Robot_Mission_Slice_Table = {
  id: string;
  process_order: number;
  disable: boolean;
  operation: {
    locationId: number;
    type: string[];
    control: string[];
    param: {
      joint: string;
      value: number;
    }[];
  };
};

export type CarType = {
  id: string;
  name: string;
  value: string;
};

export type MissionData = {
  titleId: string;
  isInfinite: boolean;
  amrId: Array<string> | undefined;
  L1: number;
  loc?: string;
  times: number;
  tasks: WriteAction[];
  [levelLoc: string]:
    | number
    | string
    | boolean
    | Array<string>
    | WriteAction[]
    | undefined;
};

interface CarControl {
  id: string;
  name: string;
  genreName: string;
  from: number;
  to: number;
  control: string[];
  f_move: number;
  f_shift: number;
  f_tilt: number;
  c_config: number;
  c_modify_dis: number;
  carTypeId: string;
}

interface CarConfig {
  id: string;
  tolerance: number;
  lookahead: number;

  carTypeId: string;
}

interface Car {
  id: string;
  name: string;
  value: string;
  CarConfig: CarConfig | null;
}

interface Action {
  id: string;
  order: number;
  is_define_id: string;
  locationId: number;
  wait: number;
  is_define_yaw: number;
  yaw: number;
  hasCargoToProcess: boolean;

  waitOtherAmr: string | null;
  waitGenre: string | null;
  auto_preparatory_point: boolean;

  titleId: string;
  is_define_height: string;
  f_height: number;
  CarControl: CarControl;
}

interface MissionTitleBridgeCategory {
  id: string;
  missionTitleId: string;
  categoryId: string;
  Category: {
    id: string;
    tagName: string;
    color: string;
  };
}

export enum YawGenre {
  CUSTOM,
  SELECT,
  CALCULATE_BY_AGV_AND_SHELF_ANGLE,
}

export type Mission_Title = {
  id: string;
  name: string;
  robot_id: string;
  MissionTitleBridgeCategory: {
    id: string;
    missionTitleId: string;
    categoryId: string;
    Category?: {
      id: string;
      tagName: string;
      color: string;
    };
  }[];
  Robot_types: {
    id: string;
    name: string;
    value: string;
  } | null;
  mission_slice?:
    | {
        id: string;
        process_order: number;
        disable: boolean;
        detail: string;
      }[]
    | null;
};
