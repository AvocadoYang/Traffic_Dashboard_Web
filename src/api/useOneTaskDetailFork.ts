import { useQuery } from "@tanstack/react-query";
import { array, boolean, number, object, string } from "yup";
import client from "./axiosClient";

// Define the Yup schema to match the data structure
const schema = object({
  id: string().required("ID is required"),
  process_order: number().required("Process order is required"),
  disable: boolean().required("Disable flag is required"),

  operation: object({
    type: string().required("Operation type must be a string"),
    control: array(string().required("Control must be a string")).optional(),
    wait: number().optional(),
    is_define_id: string().optional(),
    locationId: number().optional(),
    is_define_yaw: number().optional(),
    yaw: number().optional(),
    tolerance: number().optional(),
    lookahead: number().optional(),

    waitOtherAmr: string().optional().nullable(),
    waitGenre: string().optional().nullable(),
  }).required("Operation object is required"),

  io: object({
    fork: object({
      is_define_height: string().optional(),
      height: number().optional(),
      level: number().optional(),
      move: number().optional(),
      shift: number().optional(),
      tilt: number().optional(),
      clamp: number().optional(),
    }).optional(),
    camera: object({
      config: number().optional(),
      modify_dis: number().optional(),
    }).optional(),
  }).optional(),

  cargo_limit: object({
    load: number().optional(),
    offload: number().optional(),
  }).optional(),

  mission_status: object({
    feedback_id: string().optional(),
    name: array(string().required("Name must be a string")).optional(),
    start: string().optional(),
    end: string().optional(),
    bookBlock: array().optional(), // Assuming bookBlock is an array of unknown type; adjust if needed
  }).optional(),
}).optional();

const getOneTask = async (key: string) => {
  const { data } = await client.post<unknown>(
    "api/setting/one-task-detail-fork",
    {
      key,
    }
  );
  const validatedData = await schema.validate(data, { stripUnknown: true });
  return validatedData;
};

const useOneTaskDetailFork = (key: string) => {
  return useQuery(["one-task-detail-fork", key], {
    queryFn: () => {
      return getOneTask(key);
    },
    enabled: !!key,
  });
};

export default useOneTaskDetailFork;
