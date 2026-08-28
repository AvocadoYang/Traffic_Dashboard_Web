import { useQuery } from "@tanstack/react-query";
import { array, mixed, number, object, string } from "yup";
import client from "./axiosClient";

export type DispatchButtonType = "NORMAL" | "DYNAMIC";

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
  priority: number;
}

export type DispatchWidgetType = "MISSION_LIST" | "AMR_STATUS";

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
}

export interface DispatchPage {
  id: string;
  name: string;
  order: number;
  buttons: DispatchButton[];
  widgets: DispatchWidget[];
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
    .oneOf(["NORMAL", "DYNAMIC"])
    .required(),
  amrId: string().nullable().default(null),
  missionTitleId: string().nullable().default(null),
  ept_s: string().nullable().default(null),
  ept_d: string().nullable().default(null),
  priority: number().required(),
});

const widgetSchema = object({
  id: string().required(),
  page_id: string().required(),
  widget_type: mixed<DispatchWidgetType>()
    .oneOf(["MISSION_LIST", "AMR_STATUS"])
    .required(),
  x: number().required(),
  y: number().required(),
  width: number().required(),
  height: number().required(),
  title: string().nullable().default(null),
  amrId: string().nullable().default(null),
});

const pageSchema = array(
  object({
    id: string().required(),
    name: string().required(),
    order: number().required(),
    buttons: array(buttonSchema).required(),
    widgets: array(widgetSchema).required(),
  }).required(),
).required();

const getDispatchPages = async () => {
  const { data } = await client.get<unknown>("api/setting/dispatch-page");
  return (await pageSchema.validate(data)) as DispatchPage[];
};

export const DISPATCH_PAGE_QUERY_KEY = ["dispatch-page"];

const useMissionDispatchPages = () => {
  return useQuery({
    queryKey: DISPATCH_PAGE_QUERY_KEY,
    queryFn: getDispatchPages,
  });
};

export default useMissionDispatchPages;
