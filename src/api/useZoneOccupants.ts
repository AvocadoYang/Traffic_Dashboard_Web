import { useQuery } from "@tanstack/react-query";
import { array, lazy, object, string } from "yup";
import client from "./axiosClient";

// { [zoneId]: amrId[] } 一般 AMR 跟 MiR 的記錄後端已經合在一起
const schema = lazy((value: Record<string, unknown> | undefined) =>
  object(
    Object.fromEntries(
      Object.keys(value ?? {}).map((zoneId) => [
        zoneId,
        array(string().required()).required(),
      ]),
    ),
  ),
);

const getZoneOccupants = async () => {
  const { data } = await client.get<unknown>("api/map/zone-occupants");
  return (await schema.validate(data)) as Record<string, string[]>;
};

/** 每個區域目前系統記錄在裡面的車; 只在 hover 卡片打開時輪詢 */
const useZoneOccupants = (enabled: boolean) => {
  return useQuery({
    queryKey: ["zone-occupants"],
    queryFn: getZoneOccupants,
    enabled,
    refetchInterval: enabled ? 1000 : false,
  });
};

export default useZoneOccupants;
