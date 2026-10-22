import { useQuery } from "@tanstack/react-query";
import { array, boolean, InferType, number, object, string } from "yup";
import { locationSchema, roadSchema, zoneSchema } from "./schemas/mapEntities";
import client from "./axiosClient";

// 版本碼:只有這支列表 API 會給。編輯時原樣帶回後端,後端用它發現這筆資料
// 在打開編輯之後被別人改過。
const withRev = { rev: string().optional() };

const schema = object({
  groups: array(
    object({
      groupId: string().required(),
      groupName: string().required(),
      isUsing: boolean().required(),
      maps: array(
        object({
          mapId: string().required(),
          fileName: string().required(),
          floor: number().required(),
          locations: array(locationSchema.shape(withRev).required()).required(),
          roads: array(roadSchema.shape(withRev).required()).required(),
          zones: array(zoneSchema.shape(withRev)).required(),
        }),
      ).required(),
    }),
  ).required(),
}).required();

export type AllGroupsResources = InferType<typeof schema>;

const getAllGroupsResources = async () => {
  const { data } = await client.get<unknown>("api/setting/map-group/all-resources");
  return schema.validate(data, { stripUnknown: true });
};

// 所有地圖群組(不只使用中群組)各自底下每張地圖的點位/路徑/區域,
// 給資料夾式表格做「群組 -> 地圖」兩層瀏覽用。
const useAllGroupsResources = () => {
  return useQuery({
    queryKey: ["all-groups-resources"],
    queryFn: getAllGroupsResources,
  });
};

export default useAllGroupsResources;
