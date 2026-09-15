import { useQuery } from "@tanstack/react-query";
import { array, lazy, mixed, number, object, string } from "yup";
import client from "./axiosClient";
import { StatsChartConfig } from "./useMissionDispatchBoard";

export interface StatsPoint {
  label: string;
  value: number;
}

export type StatsSeriesChartType = "pie" | "bar" | "line";

export interface StatsSeriesResult {
  chartType: StatsSeriesChartType;
  unit: string;
  data: StatsPoint[];
}

export interface StatsTableColumn {
  key: string;
  label: string;
}

export interface StatsTableResult {
  chartType: "table";
  columns: StatsTableColumn[];
  rows: Record<string, string | number>[];
}

export type StatsChartResult = StatsSeriesResult | StatsTableResult;

const seriesResultSchema = object({
  chartType: mixed<StatsSeriesChartType>()
    .oneOf(["pie", "bar", "line"])
    .required(),
  unit: string().required(),
  data: array(
    object({
      label: string().required(),
      value: number().required(),
    }).required(),
  ).required(),
}).required();

const tableResultSchema = object({
  chartType: mixed<"table">().oneOf(["table"]).required(),
  columns: array(
    object({
      key: string().required(),
      label: string().required(),
    }).required(),
  ).required(),
  rows: array(object().required()).required(),
}).required();

const resultSchema = lazy((value: { chartType?: string }) =>
  value?.chartType === "table" ? tableResultSchema : seriesResultSchema,
);

const getDispatchWidgetStats = async (config: StatsChartConfig) => {
  const { data } = await client.get<unknown>(
    "api/setting/dispatch-widget/stats",
    {
      params: {
        metric: config.metric,
        dateRangeDays: config.dateRangeDays,
        rangeMode: config.rangeMode ?? "relative",
        ...(config.rangeMode === "absolute"
          ? { startDate: config.startDate, endDate: config.endDate }
          : {}),
      },
    },
  );
  return (await resultSchema.validate(data)) as StatsChartResult;
};

// 統計圖不需要跟即時任務資料一樣秒更新，一分鐘刷新一次就夠,也比較不會
// 讓 dashboard 一直打聚合查詢。
const STATS_REFETCH_INTERVAL_MS = 60_000;

// config 可能還沒設定（新加的 widget 還沒選統計項目），這時候不要真的發
// request——用 enabled 擋住，而不是每個呼叫端各自判斷要不要呼叫這個 hook
// （hook 本身還是要無條件呼叫，只是內部不送出查詢）。
const useDispatchWidgetStats = (config: StatsChartConfig | undefined) =>
  useQuery({
    queryKey: [
      "dispatch-widget-stats",
      config?.metric,
      config?.dateRangeDays,
      config?.rangeMode,
      config?.startDate,
      config?.endDate,
    ],
    queryFn: () => getDispatchWidgetStats(config as StatsChartConfig),
    refetchInterval: STATS_REFETCH_INTERVAL_MS,
    enabled: Boolean(config?.metric),
  });

export default useDispatchWidgetStats;
