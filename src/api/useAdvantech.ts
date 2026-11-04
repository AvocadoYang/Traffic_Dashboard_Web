import { useQuery } from "@tanstack/react-query";
import client from "@/api/axiosClient";

/** 研華 ADAM-4000 序列 IO 模組的連線資訊 (後端 advantechWish 表) */
export interface AdvantechRow {
  id: string;
  name: string;
  ip: string;
  /** 屬於哪個群組; null = 獨立的模組 */
  groupId: string | null;
  /** 在群組裡排第幾, 決定 IO 接續編號 */
  groupOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 好幾台模組合成的一個設備 (後端 advantechGroup 表); modules 已照 groupOrder 排好 */
export interface AdvantechGroupRow {
  id: string;
  name: string;
  note: string;
  modules: AdvantechRow[];
  createdAt: string;
  updatedAt: string;
}

export const ADVANTECH_KEY = ["all-advantech"];
export const ADVANTECH_GROUP_KEY = ["all-advantech-group"];

export const useAdvantech = () =>
  useQuery({
    queryKey: ADVANTECH_KEY,
    queryFn: async () => {
      const res = await client.get<AdvantechRow[]>("api/setting/all-advantech");
      return res.data;
    },
  });

export const useAdvantechGroups = () =>
  useQuery({
    queryKey: ADVANTECH_GROUP_KEY,
    queryFn: async () => {
      const res = await client.get<AdvantechGroupRow[]>(
        "api/setting/all-advantech-group",
      );
      return res.data;
    },
  });
