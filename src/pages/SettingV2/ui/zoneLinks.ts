import { useMemo } from "react";
import useActiveGroupResources from "@/api/useActiveGroupResources";

/**
 * 電梯區 / 拼接區靠 id 把幾個區域綁成一組, 交管會整組一起佔用、一起釋放:
 * - 電梯區: 不同樓層 (地圖) 的同一台電梯填同一個電梯 ID
 * - 拼接區: 區域只能畫矩形, 同一張地圖上要拼成一個區域的幾塊填同一個拼接 ID, 不能跨地圖
 */
export type LinkKind = "elevator" | "splice";

export const LINK_TAG: Record<LinkKind, string> = {
  elevator: "電梯區",
  splice: "拼接區",
};

export const LINK_FIELD = {
  elevator: "elevator_id",
  splice: "splice_id",
} as const satisfies Record<LinkKind, string>;

export type LinkZone = {
  id: string;
  name: string;
  backgroundColor: string;
  category: string[];
  tagSetting?: { elevator_id?: string | null; splice_id?: string | null };
};

export type LinkMap = {
  mapId: string;
  fileName: string;
  floor?: number;
  zones: LinkZone[];
};

export type LinkedZone = { zone: LinkZone; map: LinkMap };

/** 區域在這種關聯裡的 id; 沒勾那個分類就當沒有 (取消勾選後殘留的舊值不算) */
export const linkIdOf = (zone: LinkZone, kind: LinkKind) =>
  zone.category.includes(LINK_TAG[kind])
    ? zone.tagSetting?.[LINK_FIELD[kind]]?.trim() || null
    : null;

/** 群組裡用了這個 id 的區域 (排除 excludeId 自己), 依地圖順序 */
export const zonesWithLinkId = (
  maps: LinkMap[],
  kind: LinkKind,
  linkId: string,
  excludeId?: string,
): LinkedZone[] =>
  maps.flatMap((map) =>
    map.zones
      .filter((zone) => zone.id !== excludeId && linkIdOf(zone, kind) === linkId)
      .map((zone) => ({ zone, map })),
  );

/** 群組裡已經用過的 id, 給輸入框下拉選 */
export const usedLinkIds = (maps: LinkMap[], kind: LinkKind, excludeId?: string) =>
  [
    ...new Set(
      maps.flatMap((map) =>
        map.zones
          .filter((zone) => zone.id !== excludeId)
          .map((zone) => linkIdOf(zone, kind))
          .filter((id): id is string => !!id),
      ),
    ),
  ].sort();

/**
 * 跟這個區域綁在一起的其他區域 (使用中群組): 電梯區是所有樓層同電梯 ID 的,
 * 拼接區只看同一張地圖 (後端也只在同一張地圖內拼接)
 */
export const useLinkedZones = (zone: LinkZone) => {
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
