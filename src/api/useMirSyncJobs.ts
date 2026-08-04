import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export type MirSyncJobState =
  | "pending"
  | "pushing"
  | "verifying"
  | "done"
  | "failed";

export type MirSyncJob = {
  id: string;
  vehicle_id: string;
  target_group_id: string;
  target_hash: string;
  state: MirSyncJobState;
  progress: number;
  per_map_state: Record<string, MirSyncJobState>;
  attempts: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type MirSyncJobsResponse = {
  status: string;
  response: MirSyncJob[];
};

const getSyncJobs = async () => {
  const { data } = await client.get<MirSyncJobsResponse>(
    "api/setting/mir/sync-jobs",
  );
  return data?.response ?? [];
};

// 最近 10 筆車端地圖同步進度，預設不自動發送，由呼叫端以 enabled 控制
const useMirSyncJobs = (enabled = true) => {
  return useQuery({
    queryKey: ["mir-sync-jobs"],
    queryFn: getSyncJobs,
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
};

export default useMirSyncJobs;
