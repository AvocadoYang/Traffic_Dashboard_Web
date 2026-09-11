import { useQuery } from "@tanstack/react-query";
import { array, mixed, number, object, string } from "yup";
import client from "./axiosClient";
import { StatsMetric } from "./useMissionDispatchBoard";

export interface StatsPoint {
  label: string;
  value: number;
}

export type StatsChartType = "pie" | "bar" | "line";

export interface StatsChartResult {
  chartType: StatsChartType;
  unit: string;
  data: StatsPoint[];
}

const resultSchema = object({
  chartType: mixed<StatsChartType>().oneOf(["pie", "bar", "line"]).required(),
  unit: string().required(),
  data: array(
    object({
      label: string().required(),
      value: number().required(),
    }).required(),
  ).required(),
}).required();

const getDispatchWidgetStats = async (
  metric: StatsMetric,
  dateRangeDays: number,
) => {
  const { data } = await client.get<unknown>(
    "api/setting/dispatch-widget/stats",
    { params: { metric, dateRangeDays } },
  );
  return (await resultSchema.validate(data)) as StatsChartResult;
};

// 統計圖不需要跟即時任務資料一樣秒更新，一分鐘刷新一次就夠,也比較不會
// 讓 dashboard 一直打聚合查詢。
const STATS_REFETCH_INTERVAL_MS = 60_000;

// metric 可能還沒設定（新加的 widget 還沒選統計項目），這時候不要真的發
// request——用 enabled 擋住，而不是每個呼叫端各自判斷要不要呼叫這個 hook
// （hook 本身還是要無條件呼叫，只是內部不送出查詢）。
const useDispatchWidgetStats = (
  metric: StatsMetric | undefined,
  dateRangeDays: number,
) =>
  useQuery({
    queryKey: ["dispatch-widget-stats", metric, dateRangeDays],
    queryFn: () => getDispatchWidgetStats(metric as StatsMetric, dateRangeDays),
    refetchInterval: STATS_REFETCH_INTERVAL_MS,
    enabled: Boolean(metric),
  });

export default useDispatchWidgetStats;
