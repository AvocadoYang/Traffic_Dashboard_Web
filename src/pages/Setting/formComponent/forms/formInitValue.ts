export const initialRoadValue = {
  roadId: "",
  validYawList: [] as unknown as number[],
  priority: 3,
  x: "",
  to: "",
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  disabled: false,
  limit: false,
  roadType: "twoWayRoad",
};

export const initialLocationFormValue = {
  locationId: 0,
  areaType: "Extra",
  rotation: 0,
  canRotate: false,
};

export const initialZoneValue = {
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
};

export const initialTagFormValue = {
  speed_limit: undefined,
  forbidden: [],
  count: undefined,
  all_forbidden: false,
  not_forbidden: false,
  hight_limit: undefined,
  view_available: undefined,
};

export const initialTagSettingValue = {
  speed_limit: undefined,
  hight_limit: undefined,
  all_forbidden: undefined,
  forbidden: undefined,
};

export type TagSettingFormType = {
  speed_limit?: number;
  hight_limit?: number;
  all_forbidden?: boolean;
  forbidden?: string[];
};
