import { object, string, boolean } from "yup";
import client from "./axiosClient";
import { useQuery } from "@tanstack/react-query";

const schema = object({
  id: string().required(),
  name: string().required(),
  isUsing: boolean().required(),
}).required();

const getSim = async () => {
  const { data } = await client.get<unknown>("api/simulate/current-script");
  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useSimulateScript = () => {
  return useQuery(["simulate-script"], {
    queryFn: () => {
      return getSim();
    },
  });
};

export default useSimulateScript;
