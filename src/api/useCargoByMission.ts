import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export type CargoMissionEvent = {
  id: string;
  cargo_id: string;
  action: string;
  description: string | null;
  actor: string | null;
  mission_id: string | null;
  amr_id: string | null;
  location: string | null;
  timestamp: string;
  cargo: {
    id: string;
    custom_id: string | null;
    status: string;
    metadata: unknown;
    custom_cargo_metadata: { custom_name: string } | null;
  };
};

// 這個任務搬過哪些貨物 (任務 → 貨物)
const useCargoByMission = (missionId: string | null) =>
  useQuery({
    queryKey: ["cargo-by-mission", missionId],
    enabled: !!missionId,
    queryFn: async () => {
      const { data } = await client.get<{ data: CargoMissionEvent[] }>(
        "api/cargo-history/by-mission",
        { params: { missionId } },
      );
      return data.data;
    },
  });

export default useCargoByMission;
