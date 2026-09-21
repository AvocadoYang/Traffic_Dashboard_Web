import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MessageInstance } from "antd/es/message/interface";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

export type StepVariant = "fork" | "humanRobot" | "mir";

/** 三種車型的步驟各自有自己的 query key,其餘後端行為完全相同 */
export const STEP_QUERY_BASE: Record<StepVariant, string> = {
  fork: "all-relate-task-fork",
  humanRobot: "all-relate-task-human-robot",
  mir: "all-relate-task-mir",
};

export type KeyAndOrder = { key: string; order: number };

/**
 * 步驟清單共用的後端操作(排序、刪除、停用、移入區塊)。
 * v1 把這些在 Fork / 人形 / MiR 三張表裡各抄了一份,只差 query key。
 */
const useStepMutations = (
  variant: StepVariant,
  missionId: string,
  messageApi: MessageInstance,
) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const queryKey = [STEP_QUERY_BASE[variant], missionId];

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

  /**
   * 只有 MiR 步驟有這個。scope_reference_content 傳 null 代表移回頂層。
   * 後端合約見 set-task-scope.route.ts。
   */
  const setScope = useMutation({
    mutationFn: (payload: {
      key: string;
      scope_reference_content: string | null;
    }) =>
      client.post("api/setting/set-task-scope", {
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
    setScope,
    /** 有任何一個請求還在跑,就把清單鎖住不讓再拖 */
    busy:
      reorder.isLoading ||
      remove.isLoading ||
      setDisabled.isLoading ||
      setExtendNext.isLoading ||
      setScope.isLoading,
  };
};

export default useStepMutations;
