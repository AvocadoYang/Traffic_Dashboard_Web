import { useMemo } from "react";
import useActiveGroupResources from "@/api/useActiveGroupResources";
import {
  linkIdOf,
  zonesWithLinkId,
  type LinkMap,
  type LinkZone,
} from "@/features/map/zoneLinks";

/**
 * 跟這個區域綁在一起的其他區域 (使用中群組): 電梯區是所有樓層同電梯 ID 的,
 * 拼接區只看同一張地圖 (後端也只在同一張地圖內拼接)
 */
const useLinkedZones = (zone: LinkZone) => {
  const { data } = useActiveGroupResources();
  const elevatorId = linkIdOf(zone, "elevator");
  const spliceId = linkIdOf(zone, "splice");

  return useMemo(() => {
    const maps = (data?.maps ?? []) as LinkMap[];
    const ownMap = maps.filter((m) => m.zones.some((z) => z.id === zone.id));
    return {
      elevator: elevatorId
        ? zonesWithLinkId(maps, "elevator", elevatorId, zone.id)
        : [],
      splice: spliceId
        ? zonesWithLinkId(ownMap, "splice", spliceId, zone.id)
        : [],
      ownMapId: ownMap[0]?.mapId ?? null,
    };
  }, [data, zone.id, elevatorId, spliceId]);
};

export default useLinkedZones;
