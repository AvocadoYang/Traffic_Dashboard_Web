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
