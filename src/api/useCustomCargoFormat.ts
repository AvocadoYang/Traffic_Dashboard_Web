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

  // 舊備份還原後可能留下沒有 unique_key 的格式，這種格式無法使用；
  // 略過它們，不要讓一筆壞資料害整份清單(以及所有貨物編輯畫面)驗證失敗
  const rows = Array.isArray(data)
    ? data.filter(
        (row: { unique_key?: unknown }) =>
          typeof row?.unique_key === "string" && row.unique_key !== "",
      )
    : data;

  return schema.validate(rows, { stripUnknown: true });
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
