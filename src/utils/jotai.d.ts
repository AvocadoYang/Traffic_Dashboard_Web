export type LocationType = {
  id?: string;
  locationId: string;
  x: number;
  y: number;
  offset_x: number;
  offset_y: number;
  areaType: string;
  rotation: number;
  canRotate: boolean;
};

export type ZoneType = {
  name?: string;
  color?: AggregationColor2;
  category?: string[];
  layer: string;
  lidar_back: boolean;
  lidar_front: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type TagSettingType = {
  speed_limit: number;
  forbidden: string[];
  all_forbidden: boolean;
  not_forbidden: boolean;
  hight_limit: number;
  limitNum: number;
  view_available: string;
};

export type RoadListType = {
  roadId: string;
  validYawList: string | number[];
  x: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roadType: "oneWayRoad" | "twoWayRoad";
  checkboxGroup?: string[];
  disabled: boolean;
  limit: boolean;
};

export type Modify = {
  delete: string[];
  edit: string[];
  add: string[];
};
