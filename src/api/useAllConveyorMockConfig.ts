import { array, boolean, number, object, string } from "yup";
import client from "./axiosClient";
import { useQuery } from "@tanstack/react-query";

const getData = async () => {
  const { data } = await client.get<unknown>(
    "api/peripherals/all-mock-conveyor-config",
  );

  const schema = () =>
    array(
      object({
        locationId: string().required(),
        isEnable: boolean().required(),
        isSpawnCargo: boolean().required(),
        spawnTimeMs: number().required(),
        activeShift: boolean().required(),
        shiftTimeMs: number().required(),
        shiftLocationId: string().nullable(),
        shiftLocationDBId: string().nullable(),
      }).optional(),
    ).required();

  return schema().validate(data, { stripUnknown: true });
};

export const useAllConveyorMockConfig = () => {
  return useQuery(["all-mock-conveyor-config"], () => getData());
};
