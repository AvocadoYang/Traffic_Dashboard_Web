import { useQuery } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import type { SignalCondition } from "@/api/useSignalSources";

/** 後端 SignalTriggerRunner.status: 條件現在成不成立、上膛了沒、最近一次觸發的結果 */
export type SignalTriggerStatus = {
  now: boolean | null | "off";
  armed: boolean;
  last: { at: number; text: string } | null;
};

export type SignalTriggerRow = {
  id: string;
  active: boolean;
  /** 空的 = 不指定車, 由系統挑 */
  amrId: string[];
  missionId: string | null;
  missionName: string;
  conditions: SignalCondition[];
  match: "all" | "any";
  holdSec: number;
  status: SignalTriggerStatus;
};

export const SIGNAL_TRIGGER_KEY = ["all-signal-trigger"];

/** 頁面開著時每 3 秒重抓, 看得到條件現在的狀態和最近一次觸發 */
export const useSignalTriggers = () =>
  useQuery({
    queryKey: SIGNAL_TRIGGER_KEY,
    queryFn: async () => {
      const res = await client.get<SignalTriggerRow[]>("api/setting/all-signal-trigger");
      return res.data;
    },
    refetchInterval: 3000,
  });
