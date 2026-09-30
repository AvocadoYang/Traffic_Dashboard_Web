import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export interface ConfigFlagsResponse {
  hasMir: boolean;
}

export const CONFIG_FLAGS_KEY = ["config-flags"];

const getData = async (): Promise<ConfigFlagsResponse> => {
  const { data } = await client.get<ConfigFlagsResponse>(
    "api/setting/config-flags"
  );
  return data;
};

const useConfigFlags = () =>
  useQuery({
    queryKey: CONFIG_FLAGS_KEY,
    queryFn: getData,
    staleTime: Infinity,
  });

export default useConfigFlags;
