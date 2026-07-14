import { useQuery } from "@tanstack/react-query";
import { array, object, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    group_name: string().required(),
    maps: array(
      object({
        id: string().optional(),
        fileName: string().optional(),
      }),
    ).optional(),
  }).optional(),
);

const getData = async () => {
  const { data } = await client.get<unknown>("api/setting/map-group");
  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

export type MapGroupName = {
  id: string;
  group_name: string;
  maps: {
    id: string;
    fileName: string;
  }[];
};

const useMapGroup = () => {
  return useQuery({
    queryKey: ["map-group"],
    queryFn: getData,
  });
};

export default useMapGroup;
