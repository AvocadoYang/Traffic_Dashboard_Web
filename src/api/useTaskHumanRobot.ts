import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { array, object, string, boolean, number, InferType } from "yup";

const robotActionSchema = array(
  object({
    id: string().required("ID is required"),
    process_order: number().required("Process order is required"),
    disable: boolean().required("Disable flag is required"),

    operation: object({
      locationId: number().optional(),
      type: array(
        string().required("Operation type must be a string"),
      ).optional(),
      control: array(string().required("Control must be a string")).optional(),
      param: array(
        object({
          joint: string().optional(),
          value: number().optional(),
        }),
      ).optional(),
    }).required("Operation object is required"),
  }).optional(),
).optional();

const getRelateTask = async (key: string) => {
  const { data } = await client.post<unknown>(
    "api/setting/relative-task-human-robot",
    {
      key,
    },
  );
  const validatedData = await robotActionSchema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useTaskHumanRobot = (key: string) => {
  return useQuery(["all-relate-task-human-robot", key], {
    queryFn: () => {
      return getRelateTask(key);
    },
    select: (data) => {
      if (!data) return [];
      const newData = [...data];
      return newData.sort(
        (a, b) => (a?.process_order || 0) - (b?.process_order || 0),
      );
    },
    staleTime: Infinity,
    refetchOnWindowFocus: "always",
    refetchInterval: 2000,
  });
};
export type TaskType = InferType<typeof robotActionSchema>;

export default useTaskHumanRobot;
