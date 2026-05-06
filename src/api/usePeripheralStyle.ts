import { useQuery } from "@tanstack/react-query";
import { array, object, number, InferType, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    locationId: number().required(),
    x: number().required(),
    y: number().required(),
    name: string().optional().nullable(),
    areaType: string().required(),
    translateX: number().required(),
    translateY: number().required(),
    rotate: number().required(),
    scale: number().required(),
    flex_direction: string().required("all charge require"),
  }).optional(),
);

const getData = async (peripheralType: string | null) => {
  const { data } = await client.get<unknown>("api/peripherals/style", {
    params: peripheralType ? { peripheralType } : {},
  });
  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const usePeripheralStyle = (peripheralType: string | null) => {
  return useQuery(["peripheral-style", peripheralType], () =>
    getData(peripheralType),
  );
};

export type PeripheralStyle = {
  locationId: number;
  areaType: string;
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
};

export type AllPeripheralStyleType = InferType<typeof schema>;

export default usePeripheralStyle;
