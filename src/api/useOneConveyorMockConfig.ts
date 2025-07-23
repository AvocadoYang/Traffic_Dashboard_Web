import { boolean, number, object, string } from "yup";
import client from "./axiosClient";
import { useQuery } from "@tanstack/react-query";

const getData = async (locationId: string) => {
  const { data } = await client.get<unknown>(
    "api/peripherals/mock-conveyor-config",
    {
      params: { locationId },
    },
  );

  const schema = () =>
    object({
      locationId: string().required(),
      isEnabledNotifyMission: boolean().required(),
      isEnable: boolean().required(),
      isSpawnCargo: boolean().required(),
      spawnTimeMs: number().required(),
      activeShift: boolean().required(),
      shiftTimeMs: number().required(),
      shiftLocationId: string().nullable(),
    }).required();

  return schema().validate(data, { stripUnknown: true });
};

export const useOneConveyorMockConfig = (locationId: string) => {
  return useQuery(
    ["mock-conveyor-config", locationId],
    () => getData(locationId),
    {
      enabled: !!locationId,
    },
  );
};
