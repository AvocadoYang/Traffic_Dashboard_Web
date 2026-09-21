import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MessageInstance } from "antd/es/message/interface";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

/** Fork 步驟清單的 query key 前綴 */
export const STEP_QUERY_BASE = "all-relate-task-fork";

export type KeyAndOrder = { key: string; order: number };

/**
 * Fork 步驟清單的後端操作(排序、刪除、停用、延續下一動)。
 *
 * v1 把同一套邏輯在 Fork / 人形 / MiR 三張表裡各抄了一份,只差 query key。
 * 人形車那一支 v2 不做,MiR 改用 MiR 自己的編輯器,所以現在只剩 Fork。
 */
const useStepMutations = (missionId: string, messageApi: MessageInstance) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const queryKey = [STEP_QUERY_BASE, missionId];

  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);
  const refetch = () => queryClient.refetchQueries({ queryKey });

  const reorder = useMutation({
    mutationFn: (keyAndSort: KeyAndOrder[]) =>
      client.post("api/setting/update-task-order", {
        keyAndSort,
        missionTitleId: missionId,
        currentMapId: currentMapId || "",
      }),
    onSuccess: refetch,
    onError,
  });

  const remove = useMutation({
    mutationFn: (payload: { targetKey: string; newOrder: KeyAndOrder[] }) =>
      client.post("api/setting/delete-task", {
        missionTitleId: missionId,
        targetKey: payload.targetKey,
        newOrder: payload.newOrder,
        currentMapId: currentMapId || "",
      }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await refetch();
    },
    onError,
  });

  const setDisabled = useMutation({
    mutationFn: (payload: { id: string; disable: boolean }) =>
      client.post("api/setting/disable-task", {
        ...payload,
        missionTitleId: missionId,
        currentMapId: currentMapId || "",
      }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await refetch();
    },
    onError,
  });

  /** 只有 Fork 步驟有這個旗標 */
  const setExtendNext = useMutation({
    mutationFn: (payload: { id: string; extend_next_mission: boolean }) =>
      client.post("api/setting/extend-next-mission-task", {
        ...payload,
        missionTitleId: missionId,
        currentMapId: currentMapId || "",
      }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await refetch();
    },
    onError,
  });


  return {
    queryKey,
    reorder,
    remove,
    setDisabled,
    setExtendNext,
    /** 有任何一個請求還在跑,就把清單鎖住不讓再拖 */
    busy:
      reorder.isLoading ||
      remove.isLoading ||
      setDisabled.isLoading ||
      setExtendNext.isLoading,
  };
};

export default useStepMutations;
