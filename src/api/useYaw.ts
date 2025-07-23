import { useQuery } from "@tanstack/react-query";
import { array, object, string, number, InferType } from "yup";
import client from "./axiosClient";

const yawSchema = array(
  object({
    id: string().required(),
    yaw: number().required(),
  }).required(),
);

const getYaw = async () => {
  const { data } = await client.get<unknown>("api/setting/all-yaw");

  const validatedData = await yawSchema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useYaw = () => {
  return useQuery(["yaw"], getYaw);
};

export type YawType = InferType<typeof yawSchema>;

export type YawTypeWithoutList = {
  id: string;
  yaw: number;
};

export default useYaw;
