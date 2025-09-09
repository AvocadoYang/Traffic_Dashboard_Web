import { useQuery } from "@tanstack/react-query";
import { InferType, array, object, string, number, boolean } from "yup";
import client from "./axiosClient";

const schema = object({
  name: string().nullable(), // use string().nullable() for nullable strings
  description: string().nullable(),
  disable: boolean(),
  isManualMode: boolean(),
  hasCargoSignal: boolean(),
  locationId: string().required(), // locationId is required
  forkHeight: number(),
  cargo: array(), // Use array() for empty arrays
  status: number(),
  elevatorDBId: string(),
  loadMissionId: string().nullable(),
  offloadMissionId: string().nullable(),
  booker: string().nullable(),
  occupier: string().nullable(),
  loadPriority: number().required(),
  offloadPriority: number().required(),
}).optional();

const getData = async (locationId: string) => {
  const { data } = await client.get<unknown>(
    `api/setting/elevator-info?locationId=${locationId}`,
  );
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

const useElevatorInfo = (locationId: string) => {
  return useQuery({
    queryKey: ["elevator-info"],
    queryFn: () => getData(locationId),
  });
};

export default useElevatorInfo;
