import client from "@/api/axiosClient";
import type { FavoriteMission } from "@/api/useProfile";
import { MissionPriority } from "@/types/mission";

export class FavoriteDispatchError extends Error {
  constructor(public readonly kind: "needs_variables" | "needs_vehicle" | "failed", detail?: string) {
    super(detail ?? kind);
  }
}

/**
 * 派一個常用任務: 跟「新增任務」走同一支 API (api/missions/dialog-mission),
 * 所以派發來源、任務歷史都一樣。要填變數的 MiR 任務不能一鍵派, 請用新增任務。
 */
export const dispatchFavorite = async (fav: FavoriteMission) => {
  const { data: slices } = await client.post<{ operation?: { variables?: Record<string, string> } }[]>(
    "api/setting/relative-task-mir",
    { key: fav.titleId },
  );
  const needsVariables = (slices ?? []).some((s) => Object.keys(s?.operation?.variables ?? {}).length > 0);
  if (needsVariables) throw new FavoriteDispatchError("needs_variables");

  const res = await client.post<{ message?: string; isSuccess?: boolean }>("api/missions/dialog-mission", {
    titleId: fav.titleId,
    amrId: fav.amrId ?? "none",
    priority: fav.priority ?? MissionPriority.PIVOTAL,
  });
  if (res.data?.isSuccess === false) throw new FavoriteDispatchError("needs_vehicle");
  const msg = res.data?.message;
  if (msg && msg !== "success") throw new FavoriteDispatchError("failed", msg);
};
