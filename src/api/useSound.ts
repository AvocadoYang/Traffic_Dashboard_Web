import { useQuery } from "@tanstack/react-query";
import client from "@/api/axiosClient";

export interface SoundRow {
  id: string;
  name: string;
  created_by: string;
  duration: number | null; 
  volume: number; // 0-100
  note: string | null;
  media_path: string; 
}

export const useSound = () =>
  useQuery({
    queryKey: ["all-sound"],
    queryFn: async () => {
      const res = await client.get<SoundRow[]>("api/setting/all-sound");
      return res.data;
    },
  });


export const resolveSoundUrl = (mediaPath: string): string => {
  const base = (client.defaults.baseURL ?? "").replace(/\/+$/, "");
  const path = mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`;
  return `${base}${path}`;
};