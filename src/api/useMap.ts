import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { array, InferType, number, object, string } from "yup";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { locationSchema, roadSchema, zoneSchema } from "./schemas/mapEntities";
import api from "./axiosClient";

const schema = object({
  locations: array(locationSchema).required(),
  roads: array(roadSchema).required(),
  zones: array(zoneSchema).required(),
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

const getMap = async (mapId: string | null) => {
  const { data } = await api.get<unknown>("/api/map", {
    params: mapId ? { mapId } : undefined,
  });
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

// 群組啟用後底下所有地圖都算使用中, 但畫布一次只渲染使用者目前選擇的那一張地圖
// (currentMapIdAtom) —— 沒選擇時(null)由後端回傳 primary map 當預設值。
const useMap = () => {
  const mapId = useAtomValue(currentMapIdAtom);
  return useQuery({
    queryKey: ["map", mapId],
    queryFn: () => getMap(mapId),
  });
};

export type MapType = InferType<typeof schema>;

export default useMap;
