// useAllMissionHistory.ts
import { useQuery } from "@tanstack/react-query";
import { array, object, string, number, boolean, date } from "yup";
import client from "./axiosClient";

// 是誰、從哪台電腦派的 / 取消的; 系統自己派的任務跟舊資料是 null
const actionSourceSchema = object({
  account: string().optional(),
  ip: string().optional(),
  clientId: string().optional(),
  clientName: string().optional(),
})
  .nullable()
  .default(null);

const missionSchema = object({
  pagination: object({
    page: number().required(),
    pageSize: number().required(),
    total: number().required(),
  }),
  data: array(
    object({
      id: string().required(),
      order: number().nullable(),
      priority: number().nullable(),
      send_by: number().required(),
      send_source: actionSourceSchema,
      cancel_source: actionSourceSchema,
      // 能重新派發的紀錄才有: 要派的任務名稱跟預設的車
      redispatch: object({
        titleName: string().required(),
        amrId: string().required(),
      })
        .nullable()
        .default(null),
      amrId: string().required(),
      status: number().required(),
      full_name: array(string().optional()).required().nullable(),
      category: array(string().optional()).required().nullable(),
      sub_name: string().nullable(),
      manualMode: boolean().required(),
      emergencyBtn: boolean().required(),
      recoveryBtn: boolean().required(),
      createdAt: date().nullable(),
      assignedAt: date().nullable(),
      startedAt: date().nullable(),
      completedAt: date().nullable(),
      warningIdList: array(number().optional()).nullable(),
      batteryCost: number().required(),
      batteryRateWhenStarted: number().required(),
      totalDistanceTraveled: number().required(),
      cancel_reason: number().optional().nullable(),
      info: string().nullable(),
      message: string().nullable(),
      // 這個任務搬過幾筆貨 / 有幾次人工介入 (直接下一動)
      cargoCount: number().default(0),
      manualCount: number().default(0),
      // 放貨端「車開到才預約」拆成兩筆: 後半 / 前半是哪一筆任務
      // 每一步的時間 (毫秒時間戳); 舊任務是 null
      step_timing: array(
        object({
          step: number().required(),
          type: string().optional(),
          locationId: number().optional(),
          startedAt: number().required(),
          sentAt: number().optional(),
          doneAt: number().required(),
        }),
      )
        .nullable()
        .default(null),
      splitTo: string().nullable().optional(),
      splitFrom: string().nullable().optional(),
    }).required(),
  ),
});

/** 任務歷史的分類篩選; 跟後端 missionHistoryFilter.ts 對應, 多選都是「符合任一」 */
export type MissionHistoryFilter = {
  status?: number[];
  kind?: string[];
  amrIds?: string[];
  sendBy?: number[];
  priority?: number[];
  cancelReason?: number[];
  flags?: string[];
};

type MissionHistoryParams = MissionHistoryFilter & {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

const normalizeSearch = (search?: string) => search?.trim() || undefined;

/** 多選用逗號串起來 (status=1,3); 空的就不送 */
const csv = (list?: (string | number)[]) =>
  list?.length ? [...list].sort().join(",") : undefined;

/** 篩選條件轉成 query string 參數, 列表跟匯出共用 */
export const missionFilterParams = (f: MissionHistoryFilter) => ({
  status: csv(f.status),
  kind: csv(f.kind),
  amrIds: csv(f.amrIds),
  sendBy: csv(f.sendBy),
  priority: csv(f.priority),
  cancelReason: csv(f.cancelReason),
  flags: csv(f.flags),
});

const getAllMission = async (params: MissionHistoryParams = {}) => {
  const { data } = await client.get<unknown>("api/missions/mission-history", {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      search: normalizeSearch(params.search),
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      ...missionFilterParams(params),
    },
  });
  const parsed = await missionSchema.validate(data, { stripUnknown: true });
  return parsed;
};

const useAllMissionHistory = (params: MissionHistoryParams = {}) => {
  const search = normalizeSearch(params.search);
  return useQuery({
    queryKey: [
      "mission-history",
      params.page,
      params.pageSize,
      search,
      params.dateFrom,
      params.dateTo,
      missionFilterParams(params),
    ],
    queryFn: () => getAllMission({ ...params, search }),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

export default useAllMissionHistory;
