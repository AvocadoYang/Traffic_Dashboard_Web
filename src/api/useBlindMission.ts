import { useQuery } from "@tanstack/react-query";
import { array, object, string, number, InferType } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    name: string().optional().nullable(),
    locationId: string().required(),
    bind_mission: object({
      id: string().required(),
      name: string().optional().nullable(),
    })
      .optional()
      .nullable(),
  }).required(),
);

const getBlind = async () => {
  const { data } = await client.get<unknown>("api/setting/all-blind-mission");

  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useBlindMission = () => {
  return useQuery(["all-blind-missions"], getBlind);
};

export default useBlindMission;
