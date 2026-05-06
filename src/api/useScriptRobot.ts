import { useQuery } from "@tanstack/react-query";
import { array, boolean, InferType, number, object, string } from "yup";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    full_name: string().required(),
    is_in_script: boolean().required(),
    load_speed: number().required(),
    offload_speed: number().required(),
    move_speed: number().required(),
    script_placement_location: string().optional().nullable(),

    Robot_type: object({
      id: string().required(),
      name: string().required(),
    }).required(),
  }).optional()
).required();

const getRobot = async () => {
  const { data } = await client.get<unknown>("api/simulate/all-robot");

  return schema.validate(data, { stripUnknown: true });
};

const useScriptRobot = () => {
  return useQuery(["script-robot"], {
    queryFn: () => {
      return getRobot();
    },
  });
};

export type ScriptRobotType = InferType<typeof schema>;

export default useScriptRobot;
