import { useQuery } from "@tanstack/react-query";
import { array, object, number, InferType, string } from "yup";
import client from "./axiosClient";

const schema = object({
  total: number().required(),
  payload: array(
    object({
      id: string().required(),
      name: string().optional().nullable(),
      description: string().optional().nullable(),
      group: string().optional().nullable(),
      status: number().required(),
      quantity: number().required(),
      peripheralNameDBId: string().required(),
      level: number().required()
    }).optional(),
  ),
}).required();

const getData = async (peripheralType: string | null) => {
  const { data } = await client.get<unknown>("api/peripherals/corning-format", {
    params: peripheralType ? { peripheralType } : {},
  });
  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useCorningPeripheralFormat = (peripheralType: string | null) => {
  return useQuery({
    queryKey: ["peripheral-corning", peripheralType],
    queryFn: () => getData(peripheralType),
  });
};

export default useCorningPeripheralFormat;
