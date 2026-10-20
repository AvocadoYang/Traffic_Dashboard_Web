import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export type MissionManualAction = {
  id: string;
  created_at: string;
  action: string;
  step_idx: number | null;
  step_label: string | null;
  account: string | null;
  ip: string | null;
  client_name: string | null;
};

export type MissionDetail = {
  id: string;
  amrId: string;
  status: number;
  send_by: number;
  full_name: (string | null)[] | null;
  sub_name: string | null;
  category: (string | null)[] | null;
  createdAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  batteryCost: number;
  batteryRateWhenStarted: number;
  totalDistanceTraveled: number;
  cancel_reason: number | null;
  info: string | null;
  message: string | null;
  manual_actions: MissionManualAction[];
};

// data 為 null 代表任務紀錄已不存在 (被清掉), 不是錯誤
const useMissionDetail = (id: string | null) =>
  useQuery({
    queryKey: ["mission-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await client.get<{ data: MissionDetail | null }>(
        "api/missions/mission-detail",
        { params: { id } },
      );
      return data.data;
    },
  });

export default useMissionDetail;
