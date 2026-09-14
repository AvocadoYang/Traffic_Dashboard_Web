import { array, boolean, lazy, mixed, number, object, string } from "yup";

export const locationSchema = object({
  id: string().required(),
  locationId: string().required(),
  x: number().required(),
  y: number().required(),
  offset_x: number().required(),
  offset_y: number().required(),
  canRotate: boolean().required(),
  rotate: number().required(),
  areaType: string().required(),
  ip: string().nullable().optional(),
}).required();

export const roadSchema = object({
  id: string().required(),
  roadId: string().required(),
  roadType: mixed<"oneWayRoad" | "twoWayRoad">()
    .oneOf(["oneWayRoad", "twoWayRoad"])
    .required(),
  spot1Id: string().required(),
  spot2Id: string().required(),
  x1: number().required(),
  y1: number().required(),
  disabled: boolean().required(),
  priority: number().required(),
  limit: boolean().required(),
  x2: number().required(),
  y2: number().required(),
  validYawList: lazy((value) => {
    if (typeof value === "string") return mixed<"*">().oneOf(["*"]).required();
    return array(number().min(0).max(360).required()).required();
  }),
  tolerance: number().optional(),
  cost: number().optional(),
  inflationRadius: number().optional(),
}).required();

export const zoneSchema = object({
  id: string().required(),
  name: string().required(),
  backgroundColor: string().required(),
  category: array(string().required()).required(),
  layer: string().required(),
  lidar_front: boolean().required(),
  lidar_back: boolean().required(),
  tagSetting: object({
    speed_limit: number().nullable(),
    hight_limit: number().nullable(),
    forbidden_car: array(string()),
    limitNum: number().nullable(),
    view_available: number().nullable(),
  }).optional(),
  startPoint: object({
    startX: number().required(),
    startY: number().required(),
  }).required(),
  endPoint: object({
    endX: number().required(),
    endY: number().required(),
  }).required(),
});
