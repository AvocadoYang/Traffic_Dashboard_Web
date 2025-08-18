import { useQuery } from "@tanstack/react-query";
import { object, string } from "yup";
import httpClient from "./axiosClient";

const versionSchema = object({
  version: string().required(),
}).required();

const getVersion = async () => {
  const { data } = await httpClient.get<unknown>("api/test/version");

  const validatedData = await versionSchema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useVerityVersion = () => {
  return useQuery(["verity-version"], getVersion, {
    refetchInterval: 3000,
  });
};

export default useVerityVersion;
