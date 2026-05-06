import { useQuery } from "@tanstack/react-query";
import { array, number, object, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    peripheralNameId: string().required(),
    locationId: string().required(),
    name: string().optional().nullable(),
    description: string().optional().nullable(),
    quantity: number().optional().nullable(),
    group: array(
      object({
        id: string().optional().nullable(),
        name: string().optional().nullable(),
      }),
    )
      .optional()
      .nullable(),
    type: string().required(),
    level: number().optional().nullable(),
  }).required(),
);

const getData = async () => {
  const { data } = await client.get<unknown>("api/peripherals/name-and-type");
  const parsed = await schema.validate(data, { stripUnknown: true });
  return parsed;
};

const usePeripheralName = () => {
  return useQuery({
    queryKey: ["peripheral-name"],
    queryFn: getData,
  });
};

export default usePeripheralName;
