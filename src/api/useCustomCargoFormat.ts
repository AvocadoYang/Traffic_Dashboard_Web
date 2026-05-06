import { useQuery } from "@tanstack/react-query";
import { array, boolean, InferType, object, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    custom_name: string().required(),
    is_default: boolean().required(),
    format: string().optional(),
    unique_key: string().required(),
  }).optional()
).required();

const getData = async () => {
  const { data } = await client.get<unknown>(
    "api/setting/custom-cargo-metadata"
  );

  return schema.validate(data, { stripUnknown: true });
};

const useCustomCargoFormat = () => {
  return useQuery(["custom-cargo-format"], {
    queryFn: () => {
      return getData();
    },
  });
};

export type Custom_Cargo_Format_Type = InferType<typeof schema>;

export default useCustomCargoFormat;
