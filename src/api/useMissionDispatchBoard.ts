import { useQuery } from "@tanstack/react-query";
import { array, mixed, number, object, string } from "yup";
import client from "./axiosClient";

export type DispatchButtonType = "NORMAL" | "DYNAMIC" | "MIR";

export interface DispatchButton {
  id: string;
  page_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  fontColor: string;
  fontSize: number;
  fontWeight: number;
  dispatch_type: DispatchButtonType;
  amrId: string | null;
  missionTitleId: string | null;
  ept_s: string | null;
  ept_d: string | null;
  missionName: string | null;
  priority: number;
}

export type DispatchWidgetType =
  | "MISSION_LIST"
  | "AMR_STATUS"
  | "MAP_VIEW"
  | "TEXT"
  | "QUICK_MISSION"
  | "STATS_CHART";

// 跟後端 missionDispatchBoardRouter.ts 的 STATS_METRICS 對應，要加新圖表
// 兩邊的清單都要加。
export const STATS_METRICS = [
  "status_distribution",
  "throughput",
  "amr_mission_ranking",
  "amr_distance_ranking",
  "duration_breakdown",
  "cancel_reason",
  "category_breakdown",
  "charging_trend",
  "send_by_breakdown",
  "battery_cost_ranking",
  "route_cycle_breakdown",
  "fleet_utilization",
] as const;
export type StatsMetric = (typeof STATS_METRICS)[number];

// 存 i18n key，不是直接存中文字串——跟 AmrStatusWidgetCard.tsx 的
// AMR_STATUS_FIELD_LABEL_KEY 同一個做法，使用的地方自己呼叫 t() 轉語言。
export const STATS_METRIC_LABEL_KEY = {
  status_distribution: "mission_dispatch_board.metric_status_distribution",
  throughput: "mission_dispatch_board.metric_throughput",
  amr_mission_ranking: "mission_dispatch_board.metric_amr_mission_ranking",
  amr_distance_ranking: "mission_dispatch_board.metric_amr_distance_ranking",
  duration_breakdown: "mission_dispatch_board.metric_duration_breakdown",
  cancel_reason: "mission_dispatch_board.metric_cancel_reason",
  category_breakdown: "mission_dispatch_board.metric_category_breakdown",
  charging_trend: "mission_dispatch_board.metric_charging_trend",
  send_by_breakdown: "mission_dispatch_board.metric_send_by_breakdown",
  battery_cost_ranking: "mission_dispatch_board.metric_battery_cost_ranking",
  route_cycle_breakdown: "mission_dispatch_board.metric_route_cycle_breakdown",
  fleet_utilization: "mission_dispatch_board.metric_fleet_utilization",
} as const satisfies Record<StatsMetric, string>;

export type StatsRangeMode = "relative" | "absolute";

export interface StatsChartConfig {
  metric: StatsMetric;
  dateRangeDays: number;
  // rangeMode 沒設定時視同 "relative"（近 dateRangeDays 天）；"absolute"
  // 則改用 startDate ~ endDate 這個固定區間，兩者為 "YYYY-MM-DD" 字串。
  rangeMode?: StatsRangeMode;
  startDate?: string | null;
  endDate?: string | null;
}

export interface DispatchWidget {
  id: string;
  page_id: string;
  widget_type: DispatchWidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string | null;
  amrId: string | null;
  fontColor: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  visibleFields: string[] | null;
  chartConfig: StatsChartConfig | null;
}

export interface DispatchPage {
  id: string;
  name: string;
  order: number;
  buttons: DispatchButton[];
  widgets: DispatchWidget[];
  cellColors: Record<string, string>;
}

const buttonSchema = object({
  id: string().required(),
  page_id: string().required(),
  x: number().required(),
  y: number().required(),
  width: number().required(),
  height: number().required(),
  label: string().required(),
  color: string().required(),
  fontColor: string().required(),
  fontSize: number().required(),
  fontWeight: number().required(),
  dispatch_type: mixed<DispatchButtonType>()
    .oneOf(["NORMAL", "DYNAMIC", "MIR"])
    .required(),
  amrId: string().nullable().default(null),
  missionTitleId: string().nullable().default(null),
  ept_s: string().nullable().default(null),
  ept_d: string().nullable().default(null),
  missionName: string().nullable().default(null),
  priority: number().required(),
});

const widgetSchema = object({
  id: string().required(),
  page_id: string().required(),
  widget_type: mixed<DispatchWidgetType>()
    .oneOf([
      "MISSION_LIST",
      "AMR_STATUS",
      "MAP_VIEW",
      "TEXT",
      "QUICK_MISSION",
      "STATS_CHART",
    ])
    .required(),
  x: number().required(),
  y: number().required(),
  width: number().required(),
  height: number().required(),
  title: string().nullable().default(null),
  amrId: string().nullable().default(null),
  fontColor: string().nullable().default(null),
  fontSize: number().nullable().default(null),
  fontWeight: number().nullable().default(null),
  visibleFields: array(string().required()).nullable().default(null),
  chartConfig: object({
    metric: mixed<StatsMetric>().oneOf([...STATS_METRICS]).required(),
    dateRangeDays: number().required(),
    rangeMode: mixed<StatsRangeMode>()
      .oneOf(["relative", "absolute"])
      .default("relative"),
    startDate: string().nullable().default(null),
    endDate: string().nullable().default(null),
  })
    .nullable()
    .default(null),
});

const pageSchema = array(
  object({
    id: string().required(),
    name: string().required(),
    order: number().required(),
    buttons: array(buttonSchema).required(),
    widgets: array(widgetSchema).required(),
    cellColors: object().nullable().default(null),
  }).required(),
).required();

const getDispatchPages = async () => {
  const { data } = await client.get<unknown>("api/setting/dispatch-page");
  const pages = (await pageSchema.validate(data)) as DispatchPage[];
  return pages.map((page) => ({
    ...page,
    cellColors: page.cellColors ?? {},
  }));
};

export const DISPATCH_PAGE_QUERY_KEY = ["dispatch-page"];

const useMissionDispatchPages = () => {
  return useQuery({
    queryKey: DISPATCH_PAGE_QUERY_KEY,
    queryFn: getDispatchPages,
  });
};

export default useMissionDispatchPages;
