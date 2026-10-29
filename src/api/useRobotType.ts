import { useQuery } from "@tanstack/react-query";
import { array, boolean, InferType, number, object, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    value: string().required(),
    width: number().required(),
    height: number().required(),
    length: number().required(),
    // 模擬的 3D 回放照車型畫模型 (見 Fleet3D/vehicleModels); 舊後端沒有這幾個欄位
    model_3d: string().nullable().optional().default(null),
    model_3d_yaw: number().optional().default(0),
    model_3d_file: object({ updated_at: string().required() }).nullable().optional().default(null),
  }).optional()
).required();

const getRobot = async () => {
  const { data } = await client.get<unknown>("api/simulate/all-robot-type");

  return schema.validate(data, { stripUnknown: true });
};

const useRobotType = () => {
  return useQuery(["robot-type"], {
    queryFn: () => {
      return getRobot();
    },
  });
};

export type ScriptRobotType = InferType<typeof schema>;

export default useRobotType;
