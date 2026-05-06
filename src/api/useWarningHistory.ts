import { array, object, string, date, boolean, mixed, number } from "yup";
import { InferType } from "yup";
import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

const schema = array(
  object({
    id: string().required(),
    warning_id: number().required(),
    createdAt: date().required(),
    warning: object({
      info_ch: string().required(),
    }).required(),
  })
).required();

const getData = async (page = 1, pageSize = 50) => {
  const { data } = await client.get("api/records/warning-history", {
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

const useWarningHistory = (page: number, pageSize: number) => {
  return useQuery({
    queryKey: ["warning-history", page, pageSize],
    queryFn: () => getData(page, pageSize),
    refetchInterval: 3000,
  });
};

export default useWarningHistory;
