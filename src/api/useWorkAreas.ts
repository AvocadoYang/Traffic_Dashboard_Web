import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/**
 * 作業區: 共用同一條走道的群組放在一起, 限制區內同時作業的車數。
 * 進不去的車先到等待點排隊; 等待點是點位的屬性, 在編輯點位設定。
 */
export type WorkArea = {
  id: string;
  name: string;
  /** 區內同時最多幾台車 */
  capacity: number;
  groupIds: string[];
  /** 由隊首 (最靠近入口) 排到隊尾 */
  waitPoints: { id: string; locationId: string; order: number }[];
};

export type WorkAreaConfig = {
  schemaReady: boolean;
  groups: { id: string; name: string; workAreaId: string | null }[];
  areas: WorkArea[];
};

/** 車子停得住的點位才能當等待點, 跟後端的 WAIT_POINT_AREA_TYPES 一致 */
export const WAIT_POINT_AREA_TYPES = ["EXTRA", "STANDBY", "DISPATCH"];

export const WORK_AREA_CONFIG_KEY = ["work-area-config"];

export const useWorkAreaConfig = () =>
  useQuery({
    queryKey: WORK_AREA_CONFIG_KEY,
    queryFn: async () => {
      const { data } = await client.get<WorkAreaConfig>("api/work-area/config");
      return data;
    },
  });
