import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { ReportQuery, reportParams } from "./useOperationReport";

/** 預估準確度的統計 (秒); 誤差 = 實際 - 預估, 正的 = 比預估慢 */
export interface EtaAccuracyStat {
  count: number;
  predictedAvg: number;
  actualAvg: number;
  absErrorAvg: number;
  bias: number;
  absErrorP90: number;
  /** 準的比例 0 ~ 1 */
  withinRate: number;
}

export interface EtaAccuracyRow {
  missionId: string;
  amrId: string;
  route: string;
  assignedAt: number;
  predictedSec: number;
  actualSec: number;
  errorSec: number;
}

export interface EtaAccuracyReport {
  from: number;
  to: number;
  summary: EtaAccuracyStat;
  routes: (EtaAccuracyStat & { route: string })[];
  vehicles: (EtaAccuracyStat & { amrId: string })[];
  worst: EtaAccuracyRow[];
}

const useEtaAccuracyReport = (query: ReportQuery | null) =>
  useQuery({
    queryKey: ["eta-accuracy-report", query],
    queryFn: async () => {
      const { data } = await client.get<EtaAccuracyReport>("api/report/eta-accuracy", {
        params: reportParams(query as ReportQuery),
      });
      return data;
    },
    enabled: !!query,
    refetchOnWindowFocus: false,
  });

export default useEtaAccuracyReport;
