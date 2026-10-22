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

  // rev 是版本碼: 存檔時原樣帶回後端, 後端用它發現這個步驟被別人改過
  return data as Fork_Action & { rev?: string };
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
