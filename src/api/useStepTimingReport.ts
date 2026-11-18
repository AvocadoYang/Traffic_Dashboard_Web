import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { ReportQuery, reportParams } from "./useOperationReport";

export interface StepStat {
  avg: number;
  p90: number;
  max: number;
}

export interface StepStatRow {
  count: number;
  /** 有算出間隔的步數 (每個任務第一步沒有上一步) */
  gapCount: number;
  gap: StepStat;
  run: StepStat;
}

export interface StepTypeRow extends StepStatRow {
  type: string;
}
export interface StepLocationRow extends StepStatRow {
  locationId: number;
}
export interface StepVehicleRow extends StepStatRow {
  amrId: string;
}

export interface StepTimingReport {
  from: number;
  to: number;
  summary: { missions: number; steps: number; gap: StepStat; run: StepStat };
  types: StepTypeRow[];
  locations: StepLocationRow[];
  vehicles: StepVehicleRow[];
}

const useStepTimingReport = (query: ReportQuery | null) =>
  useQuery({
    queryKey: ["step-timing-report", query],
    queryFn: async () => {
      const { data } = await client.get<StepTimingReport>("api/report/step-timing", {
        params: reportParams(query as ReportQuery),
      });
      return data;
    },
    enabled: !!query,
    refetchOnWindowFocus: false,
  });

export default useStepTimingReport;
