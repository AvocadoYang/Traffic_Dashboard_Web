import { useQuery } from "@tanstack/react-query";
import client from "@/api/axiosClient";

/** 研華 ADAM-4000 序列 IO 模組的連線資訊 (後端 advantechWish 表) */
export interface AdvantechRow {
  id: string;
  name: string;
  ip: string;
  createdAt: string;
  updatedAt: string;
}

export const ADVANTECH_KEY = ["all-advantech"];

export const useAdvantech = () =>
  useQuery({
    queryKey: ADVANTECH_KEY,
    queryFn: async () => {
      const res = await client.get<AdvantechRow[]>("api/setting/all-advantech");
      return res.data;
    },
  });
