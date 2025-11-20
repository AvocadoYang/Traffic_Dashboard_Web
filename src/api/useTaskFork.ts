import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { array, object, string, boolean, number, InferType } from "yup";
import { Fork_Action } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/types";

const getRelateTask = async (key: string) => {
  const { data } = await client.post<unknown>(
    "api/setting/relative-task-fork",
    {
      key,
    }
  );

  return data as Fork_Action[];
};

const useTaskFork = (key: string) => {
  return useQuery({
    queryKey: ["all-relate-task-fork", key],
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

export default useTaskFork;
