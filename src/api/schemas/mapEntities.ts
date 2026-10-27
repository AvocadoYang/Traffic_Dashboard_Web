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
  // 等待點: 屬於哪個作業區、排第幾個; 不是等待點時 wait_area_id 是 null
  wait_area_id: string().nullable().optional(),
  wait_order: number().optional(),
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
  disabled: boolean().optional(),
  tagSetting: object({
    speed_limit: number().nullable(),
    hight_limit: number().nullable(),
    forbidden_car: array(string()),
    limitNum: number().nullable(),
    view_available: number().nullable(),
    elevator_id: string().nullable(),
    splice_id: string().nullable(),
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

/** 地圖標註: 畫在地圖上給人看的文字 / 框線, 座標是地圖座標 (公尺) */
export const annotationSchema = object({
  id: string().required(),
  kind: mixed<"text" | "rect">().oneOf(["text", "rect"]).required(),
  text: string().defined(),
  x: number().required(),
  y: number().required(),
  x2: number().nullable().defined(),
  y2: number().nullable().defined(),
  fontSize: number().required(),
  color: string().defined(),
  backgroundColor: string().defined(),
  borderColor: string().defined(),
  fillColor: string().defined(),
  borderWidth: number().required(),
  // 舊版後端沒有這個欄位
  rotation: number().default(0),
  rev: string().required(),
}).required();
