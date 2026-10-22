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
  /** 距離太近、不能同時停車的等待點配對 (點位編號) */
  tooClose: [string, string][];
};

export type WorkAreaConfig = {
  schemaReady: boolean;
  /** 後端有沒有開「等待中」任務; 沒開的話作業區不會生效 */
  waitingEnabled: boolean;
  /** 兩個等待點至少要隔多遠才能同時停車 (公尺) */
  minGap: number;
  groups: { id: string; name: string; workAreaId: string | null }[];
  areas: WorkArea[];
};

/**
 * FREE: 空的; STANDBY: 有車停著等進場; COMING: 已經派車、還在路上;
 * BLOCKED: 有車停在上面但現在不能派; TOO_CLOSE: 離有車的等待點太近, 停不下第二台
 */
export type WaitPointState = "FREE" | "STANDBY" | "COMING" | "BLOCKED" | "TOO_CLOSE";

/** 作業區的即時狀態 */
export type WorkAreaRuntime = {
  areaId: string;
  name: string;
  capacity: number;
  /** 算進區內車數的: 還在跑的任務 (missionId), 或做完還停在區內的車 (missionId 是 null) */
  inside: { missionId: string | null; amrId: string | null }[];
  waitPoints: {
    locationId: string;
    order: number;
    state: WaitPointState;
    amrId: string | null;
  }[];
  /** 還在等進場的任務, 先來的排前面 */
  waiting: { missionId: string; reason: string }[];
  updatedAt: string;
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

/** 每個作業區目前的狀態; 幾秒刷新一次 */
export const useWorkAreaRuntime = () =>
  useQuery({
    queryKey: ["work-area-runtime"],
    queryFn: async () => {
      const { data } = await client.get<{ areas: WorkAreaRuntime[] }>(
        "api/work-area/runtime",
      );
      return data.areas;
    },
    refetchInterval: 2000,
  });
