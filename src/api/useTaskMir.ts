import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { array, object, string, boolean, number, InferType } from "yup";
import { Fork_Action } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/types";
import { Mir_Action } from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/type";

const getRelateTask = async (key: string) => {
  const { data } = await client.post<unknown>(
    "api/setting/relative-task-mir",
    {
      key,
    }
  );

  return data as Mir_Action[];
};

const useTaskMir = (key: string) => {
  return useQuery({
    queryKey: ["all-relate-task-mir", key],
    queryFn: () => {
      return getRelateTask(key);
    },
    select: (data) => {
      if (!data) return [];
      const newData = [...data];
      return newData.sort(
        (a, b) => (a?.process_order || 0) - (b?.process_order || 0)
      );
    },
    staleTime: Infinity,
    refetchOnWindowFocus: "always",
    refetchInterval: 2000,
  });
};

export default useTaskMir;
