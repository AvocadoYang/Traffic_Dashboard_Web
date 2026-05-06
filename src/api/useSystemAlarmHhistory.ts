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

const getData = async (page = 1, pageSize = 50) => {
  const { data } = await client.get("api/records/system-alarm-history", {
    params: { page, pageSize },
  });

  return schema
    .validate(data.data, { stripUnknown: true })
    .then((validated) => ({
      data: validated,
      total: data.total,
      storageSizeMb: data.storageSizeMb,
    }));
};

const useSystemAlarmHhistory = (page: number, pageSize: number) => {
  return useQuery({
    queryKey: ["system-alarm-history", page, pageSize],
    queryFn: () => getData(page, pageSize),
    refetchInterval: 3000,
  });
};

export default useSystemAlarmHhistory;
