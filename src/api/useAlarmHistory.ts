import { array, object, string, date, boolean, mixed, number } from "yup";
import { InferType } from "yup";
import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    alarm_id: number().required(),
    createdAt: date().required(),
    alarm: object({
      info_ch: string().required(),
    }).required(),
  })
).required();

export type HistoryRange = { start?: string; end?: string };

const getData = async (page = 1, pageSize = 50, range: HistoryRange = {}) => {
  const { data } = await client.get("api/records/alarm-history", {
    params: { page, pageSize, start: range.start, end: range.end },
  });

  return schema
    .validate(data.data, { stripUnknown: true })
    .then((validated) => ({
      data: validated,
      total: data.total,
      storageSizeMb: data.storageSizeMb,
    }));
};

const useAlarmHistory = (
  page: number,
  pageSize: number,
  range: HistoryRange = {},
) => {
  return useQuery({
    queryKey: ["alarm-history", page, pageSize, range.start, range.end],
    queryFn: () => getData(page, pageSize, range),
    refetchInterval: 3000,
  });
};

export default useAlarmHistory;
