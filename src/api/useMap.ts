import { useQuery } from "@tanstack/react-query";
import {
  array,
  boolean,
  InferType,
  lazy,
  mixed,
  number,
  object,
  string,
} from "yup";
import { MISSION_CONTROL_URL, MISSION_CONTROL_WS_URL } from "../configs/config";
import api from "./axiosClient";

const schema = object({
  locations: array(
    object({
      id: string().required(),
      locationId: string().required(),
      x: number().required(),
      y: number().required(),
      offset_x: number().required(),
      offset_y: number().required(),
      canRotate: boolean().required(),
      areaType: string().required(),
    }).required(),
  ).required(),
  roads: array(
    object({
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
        if (typeof value === "string")
          return mixed<"*">().oneOf(["*"]).required();
        return array(number().min(0).max(360).required()).required();
      }),
      tolerance: number().optional(),
      cost: number().optional(),
      inflationRadius: number().optional(),
    }).required(),
  ).required(),
  zones: array(
    object({
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
    }),
  ).required(),
  mapWidth: number().required(),
  mapHeight: number().required(),
  mapOriginX: number().required(),
  mapOriginY: number().required(),
  mapResolution: number().positive().required(),
  imageUrl: string().optional(),
  scale: number().required(),
  scrollX: number().required(),
  scrollY: number().required(),
}).required();

const getMap = async () => {
  const { data } = await api.get<unknown>("/api/map");
  const parsed = await schema.validate(data, { stripUnknown: true });
  if (parsed.imageUrl) {
    const baseUrl = `${window.location.origin}`
      .replace("localhost", location.hostname)
      .replace(/:5173/, ":4000")
      .replace(/\/+$/, "");

    const path = parsed.imageUrl.replace(/^\/+/, "");

    parsed.imageUrl = `${baseUrl}/${path}`;
  }

  // console.log(parsed.imageUrl,'papsappsa')

  return parsed;
};

const useMap = () => {
  return useQuery({
    queryKey: ["map"],
    queryFn: () => getMap(),
  });
};

export type MapType = InferType<typeof schema>;

export default useMap;
