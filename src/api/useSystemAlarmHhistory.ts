import { array, object, string, number, date } from "yup";
import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    message: string().required(),
    level: number().required(),
    tstamp: date().required(),
  }),
).required();

export type HistoryRange = { start?: string; end?: string };

const getData = async (page = 1, pageSize = 50, range: HistoryRange = {}) => {
  const { data } = await client.get("api/records/system-alarm-history", {
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

const useSystemAlarmHhistory = (
  page: number,
  pageSize: number,
  range: HistoryRange = {},
) => {
  return useQuery({
    queryKey: ["system-alarm-history", page, pageSize, range.start, range.end],
    queryFn: () => getData(page, pageSize, range),
    refetchInterval: 3000,
  });
};

export default useSystemAlarmHhistory;
