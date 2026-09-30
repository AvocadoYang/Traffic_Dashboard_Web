import { useQuery } from "@tanstack/react-query";
import { boolean, InferType, object, string } from "yup";
import api from "./axiosClient";

const connectivitySchema = object({
  ecs: boolean().required(),
  fleet: boolean().required(),
  ha: boolean().required(),
}).required();

const schema = object({
  redundancy: boolean().required(),
  role: string().oneOf(["MASTER", "BACKUP"]).required(),
  arbiter: object({
    is_master: boolean().required(),
    maintenance: boolean().required(),
    self: connectivitySchema,
    other: connectivitySchema,
  })
    .nullable()
    .default(null),
  arbiterError: string().optional().nullable(),
}).required();

export type HaStatus = InferType<typeof schema>;

const getHaStatus = async (): Promise<HaStatus> => {
  const { data } = await api.get<unknown>("/api/ha/status");
  return schema.validate(data, { stripUnknown: true });
};

// HA 沒開的環境（REDUNDANCY: false）打這支 API 也只會拿到 { redundancy: false, role }，
// 不會出錯，所以不需要額外用 enabled 去擋，直接讓元件自己依 redundancy 決定要不要畫。
const useHaStatus = () =>
  useQuery(["ha-status"], getHaStatus, {
    refetchInterval: 3000,
  });

export default useHaStatus;
