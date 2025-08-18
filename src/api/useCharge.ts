import { useQuery } from "@tanstack/react-query";
import { InferType, array, object, string, number, boolean } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    active: boolean().optional().nullable(),
    amrIds: array(string().optional()).optional(),
    aggressiveThreshold: number().optional().nullable(),
    fullThreshold: number().optional().nullable(),
    availableGetTaskThreshold: number().optional().nullable(),

    titleId: string().optional().nullable(),
    title: string().optional().nullable(),
  }).optional(),
).required();

const getCommon = async () => {
  const { data } = await client.get<unknown>("api/setting/all-charge-mission");
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

const useCharge = () => {
  return useQuery(["charge-mission"], () => getCommon());
};
export type ChargeMissionType = InferType<typeof schema>;

export default useCharge;
