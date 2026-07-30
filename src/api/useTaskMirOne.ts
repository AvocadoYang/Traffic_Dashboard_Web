import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { array, object, string, boolean, number, InferType } from "yup";
import { Fork_Action } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/types";
import { Mir_Action } from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/type";

const getRelateTaskOne = async (key: string) => {
  const { data } = await client.post<unknown>(
    "api/setting/task-mir-one",
    {
      key,
    }
  );

  return data as Mir_Action;
};

const useTaskMirOne = (key: string) => {
  return useQuery({
    queryKey: ["one-relate-task-mir", key],
    queryFn: () => {
      return getRelateTaskOne(key);
    },
  });
};

export default useTaskMirOne;
