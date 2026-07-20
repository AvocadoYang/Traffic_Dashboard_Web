import { useQuery } from "@tanstack/react-query";
import { array, InferType, number, object, string } from "yup";
import { locationSchema, roadSchema, zoneSchema } from "./schemas/mapEntities";
import client from "./axiosClient";

const schema = object({
  groupId: string().optional().nullable(),
  groupName: string().optional().nullable(),
  maps: array(
    object({
      mapId: string().required(),
      fileName: string().required(),
      floor: number().required(),
      locations: array(locationSchema).required(),
      roads: array(roadSchema).required(),
      zones: array(zoneSchema).required(),
    }),
  ).required(),
}).required();

const getActiveGroupResources = async () => {
  const { data } = await client.get<unknown>(
    "api/setting/map-group/active-resources",
  );
  return schema.validate(data, { stripUnknown: true });
};

export type ActiveGroupResources = InferType<typeof schema>;

// 使用中群組內「每張地圖各自的」點位/路徑/區域, 給地圖資料夾式表格用。
const useActiveGroupResources = () => {
  return useQuery({
    queryKey: ["active-group-resources"],
    queryFn: getActiveGroupResources,
  });
};

export default useActiveGroupResources;
