import { useQuery } from "@tanstack/react-query";
import { boolean, InferType, number, object, string } from "yup";
import api from "./axiosClient";

const connectivitySchema = object({
  ecs: boolean().required(),
  fleet: boolean().required(),
  ha: boolean().required(),
}).required();

// 對方的狀態是對方 arbiter 每秒送過來的; 舊版 arbiter 沒有後面這三個欄位,
// status_known 是 false (連不到對方、或對方是舊版) 時 ecs / fleet / is_master / has_vip 都不能信
const peerSchema = connectivitySchema.shape({
  is_master: boolean().optional(),
  has_vip: boolean().optional(),
  status_known: boolean().optional(),
});

const schema = object({
  redundancy: boolean().required(),
  role: string().oneOf(["MASTER", "BACKUP"]).required(),
  // false: arbiter 還沒告訴過交管角色 (開機後先當 BACKUP 不派車); 舊版後端沒有這個欄位
  roleKnown: boolean().default(true),
  arbiter: object({
    is_master: boolean().required(),
    // 新版 arbiter 才有
    has_vip: boolean().optional(),
    vip: string().optional(),
    maintenance: boolean().required(),
    self: connectivitySchema,
    other: peerSchema,
  })
    .nullable()
    .default(null),
  arbiterError: string().optional().nullable(),
  // VIP 跟角色對不上 (MASTER 沒有 VIP / BACKUP 拿著 VIP): since 是開始的時間, alarmed = 滿 10 秒,
  // 後端已經告警 (正常切換時 VIP 要幾秒才移過去, 那幾秒不算); 舊版後端沒有這個欄位
  vipMismatch: object({
    since: number().nullable().default(null),
    alarmed: boolean().default(false),
  })
    .nullable()
    .default(null),
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
