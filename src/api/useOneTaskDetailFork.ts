import { useQuery } from "@tanstack/react-query";
import { array, boolean, number, object, string } from "yup";
import client from "./axiosClient";
import { Fork_Action } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/types";

const getOneTask = async (key: string) => {
  const { data } = await client.post<unknown>(
    "api/setting/one-task-detail-fork",
    {
      key,
    }
  );

  return data as Fork_Action;
};

const useOneTaskDetailFork = (key: string) => {
  return useQuery({
    queryKey: ["one-task-detail-fork", key],
    queryFn: () => {
      return getOneTask(key);
    },
    enabled: !!key,
  });
};

export default useOneTaskDetailFork;
