import { useQuery } from "@tanstack/react-query";
import { InferType, array, object, string, number, boolean } from "yup";
import client from "./axiosClient";

const schema =
  object({
     locationId: string().required(),
  name: string().optional().nullable(),
  description: string().optional().nullable(),
  group: string().optional().nullable(),
  disable: boolean().required(),
  booker: string().optional().nullable(),
  occupier: string().optional().nullable(),
  currentStatus: object({
    
  }).optional().nullable(),
  ip: string().optional().nullable(),
  port: number().required()
  }).optional()


const getData = async (locationId: string) => {
  const { data } = await client.get<unknown>(`api/peripherals/update-charge-station-config?locationId=${locationId}`);
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

const useChargeStationConfig = (locationId: string) => {
  return useQuery({
    queryKey: ["peripheral-corning", locationId],
    queryFn: () => getData(locationId),
  });
};
export type ChargeMissionType = InferType<typeof schema>;

export default useChargeStationConfig;
