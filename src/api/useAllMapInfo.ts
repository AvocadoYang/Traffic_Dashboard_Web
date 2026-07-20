import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { array, object, string, boolean, number } from "yup";

const schema = object({
  allMap: array(
    object({
      id: string().required(),
      isUsing: boolean().required(),
      fileName: string().required(),
      imagePath: string().required(),
      mapOriginX: number().required(),
      mapOriginY: number().required(),
      mapWidth: number().required(),
      mapHeight: number().required(),
      scale: number().required(),
      scrollX: number().required(),
      scrollY: number().required(),
      floor: number().required(),
      resolution: number().optional(),
      map_group_id: string().optional().nullable(),
      group: object({
        id: string().required(),
        group_name: string().required(),
        isUsing: boolean().optional(),
        active_map_id: string().optional().nullable(),
      })
        .optional()
        .nullable(),
    }),
  ).required(),
  systemFilePath: string().required(),
}).required();

const getAllMapInfo = async () => {
  const { data } = await client.get<unknown>("api/setting/get-allMapData");
  const validateData = await schema
    .validate(data)
    .catch(() => console.log("useAllMapInfo error"));
  return validateData;
};

const useAllMapInfo = () => {
  return useQuery({
    queryKey: ["all-map-Info"],
    queryFn: getAllMapInfo,
  });
};

export default useAllMapInfo;
