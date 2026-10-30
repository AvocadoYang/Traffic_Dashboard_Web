import { useQuery } from "@tanstack/react-query";
import { InferType, array, object, string, number } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    value: string().required(),
    length: number().required(),
    height: number().required(),
    width: number().required(),
    /** 3D 檢視用哪個模型 (null = 預設, 照車名); 舊後端沒有這幾個欄位 */
    model_3d: string().nullable().optional().default(null),
    model_3d_yaw: number().optional().default(0),
    /** 上傳的模型 (檔案另外拿, 見 Fleet3D/vehicleModels) */
    model_3d_file: object({
      file_name: string().required(),
      size: number().required(),
      updated_at: string().required(),
    })
      .nullable()
      .optional()
      .default(null),
  }).required(),
);

const getAmrs = async () => {
  const { data } = await client.get<unknown>("api/setting/all-robot-type");
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

const useAMRsample = () => {
  return useQuery(["amr-sample"], getAmrs);
};
export type ASType = InferType<typeof schema>;
export default useAMRsample;
