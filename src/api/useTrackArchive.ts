import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/**
 * 車輛位置的長期紀錄 (後端 TrackArchive): 給車隊回放和熱度圖用。保留 7 天, 一次最長 6 小時。
 * 時間都是毫秒 (epoch)。
 */

/** [時間, x, y, yaw (度)] */
export type TrackSample = [number, number, number, number];

export type TrackVehicle = {
  amrId: string;
  /** 實車 (SW15 實車的座標要另外轉); 後端查不到是 null */
  isReal: boolean | null;
  samples: TrackSample[];
  /** 有沒有載貨, 只記變的時候: [時間, 0 / 1] */
  cargo: [number, number][];
};

export type TrackReplayData = { from: number; to: number; vehicles: TrackVehicle[] };

export type HeatCell = {
  ix: number;
  iy: number;
  /** 車待在這格的秒數 (所有車加總) */
  dwell: number;
  /** 車開進這格的次數 */
  passes: number;
};

export type TrackHeatData = { from: number; to: number; cell: number; vehicleCount: number; cells: HeatCell[] };

export type TrackRange = { from: number; to: number };

export const useTrackReplay = (range: TrackRange | null) =>
  useQuery({
    queryKey: ["track-replay", range?.from, range?.to],
    enabled: !!range,
    queryFn: async () => (await client.get<TrackReplayData>("api/amr/track-replay", { params: range })).data,
    staleTime: 60_000,
    keepPreviousData: true,
  });

export const useTrackHeat = (range: TrackRange | null, cell: number) =>
  useQuery({
    queryKey: ["track-heat", range?.from, range?.to, cell],
    enabled: !!range,
    queryFn: async () => (await client.get<TrackHeatData>("api/amr/track-heat", { params: { ...range, cell } })).data,
    staleTime: 60_000,
    keepPreviousData: true,
  });
