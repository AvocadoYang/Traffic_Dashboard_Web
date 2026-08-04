import { useQuery } from "@tanstack/react-query";
import { array, number, object, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    fileName: string().required(),
    mapOriginX: number().required(),
    mapOriginY: number().required(),
    mapWidth: number().required(),
    mapHeight: number().required(),
    scale: number().required(),
    scrollX: number().required(),
    scrollY: number().required(),
    map_group_id: string().optional().nullable(),
    map_group_name: string().optional().nullable(),
    floor: number().required(),
  }),
).required();

const getMapList = async () => {
  const { data } = await client.get<unknown>("api/map/list");
  return schema.validate(data, { stripUnknown: true });
};

export type MapListItem = {
  id: string;
  fileName: string;
  mapOriginX: number;
  mapOriginY: number;
  mapWidth: number;
  mapHeight: number;
  scale: number;
  scrollX: number;
  scrollY: number;
  map_group_id?: string | null;
  map_group_name?: string | null;
  floor: number;
};

// 使用中群組內「所有」地圖的基本 metadata, 給地圖選擇器與資料夾式表格列出地圖清單用。
const useMapList = () => {
  return useQuery({
    queryKey: ["map-list"],
    queryFn: getMapList,
  });
};

export default useMapList;
