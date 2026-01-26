import { useQuery } from "@tanstack/react-query";
import { InferType, array, object, string, number, boolean } from "yup";
import client from "./axiosClient";

const schema = object({
  name: string().nullable(), // use string().nullable() for nullable strings
  description: string().nullable(),
  disable: boolean(),
  locationId: string().required(), // locationId is required
  cargo: array(), // Use array() for empty arrays
  status: number(),
  stackDBId: string(),
  loadMissionId: string().nullable(),
  offloadMissionId: string().nullable(),
  booker: string().nullable(),
  occupier: string().nullable(),
  loadPriority: number().required(),
  offloadPriority: number().required(),
}).optional();

const getData = async (locationId: string) => {
  const { data } = await client.get<unknown>(
    `api/setting/stack-info?locationId=${locationId}`,
  );
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

const useStackInfo = (locationId: string) => {
  return useQuery({
    queryKey: ["stack-info"],
    queryFn: () => getData(locationId),
  });
};

export default useStackInfo;
