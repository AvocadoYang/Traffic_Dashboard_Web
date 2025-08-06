import { useQuery } from "@tanstack/react-query";
import { array, object, number, InferType, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    description: string().optional().nullable(),
    peripherals: array(
      object({
        id: string().optional(),
        name: string().optional(),
        type: string().optional(),
      }),
    ).optional(),
  }).optional(),
);

const getData = async () => {
  const { data } = await client.get<unknown>("api/setting/peripheral-group");
  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

export type PeripheralGroupName = {
  id: string;
  name: string;
  description: string | null;
  peripherals: {
    id: string;
    name: string;
    type: string;
  }[];
};

const usePeripheralGroup = () => {
  return useQuery({
    queryKey: ["peripheral-group"],
    queryFn: getData,
  });
};

export default usePeripheralGroup;
