import { array, boolean, number, object, string } from "yup";
import client from "./axiosClient";
import { useQuery } from "@tanstack/react-query";

const getFootprint = async () => {
  const { data } = await client.get<unknown>("api/setting/all-footprint");

  const schema = () =>
    array(
      object({
        id: string().required(),
        name: string().required(),
        config_id: string().required(),
        footprint_points: string().required(),
        height: string().required(),
      }).required(),
    ).required();

  return schema().validate(data, { stripUnknown: true });
};

export const useFootprint = () => {
  return useQuery({
    queryKey: ["footprint"],
    queryFn: getFootprint,
  });
};
