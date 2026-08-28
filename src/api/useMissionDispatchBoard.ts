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
  | "QUICK_MISSION";

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
    .oneOf(["MISSION_LIST", "AMR_STATUS", "MAP_VIEW", "TEXT", "QUICK_MISSION"])
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
