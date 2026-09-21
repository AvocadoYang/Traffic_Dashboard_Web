import { useMemo } from "react";
import type { MessageInstance } from "antd/es/message/interface";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import useStepMutations from "./useStepMutations";

/** 步驟至少都有這三個欄位,排序與刪除只需要這些 */
export type BaseStep = {
  id: string;
  process_order: number;
  disable: boolean;
};

/**
 * 步驟清單的排序 / 刪除邏輯。
 *
 * @param orderable 有全域 process_order 的步驟
 */
const useStepList = <T extends BaseStep>(
  missionId: string,
  orderable: T[],
  messageApi: MessageInstance,
) => {
  const queryClient = useQueryClient();
  const mutations = useStepMutations(missionId, messageApi);
  const { queryKey, reorder, remove } = mutations;

  return useMemo(() => {
    /**
     * 重排之後要連 process_order 一起改。v1 只換陣列順序就寫回快取,
     * 但 query 的 select 會再按 process_order 排一次,所以畫面根本不會動,
     * 要等 2 秒的輪詢把新資料撈回來才看得到,拖起來像沒反應。
     */
    const applyOrder = (next: T[]) => {
      const renumbered = next.map((v, i) => ({ ...v, process_order: i }));
      queryClient.setQueryData(queryKey, renumbered);
      reorder.mutate(
        renumbered.map((v) => ({ key: v.id, order: v.process_order })),
      );
    };

    const moveStep = (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || to >= orderable.length) return;
      applyOrder(arrayMove(orderable, from, to));
    };

    const onDragEnd = ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      moveStep(
        orderable.findIndex((v) => v.id === active.id),
        orderable.findIndex((v) => v.id === over.id),
      );
    };

    /** 刪掉一筆之後,剩下的頂層步驟要重新編號 */
    const removeStep = (id: string) => {
      remove.mutate({
        targetKey: id,
        newOrder: orderable
          .filter((v) => v.id !== id)
          .map((v, i) => ({ key: v.id, order: i })),
      });
    };

    return { moveStep, onDragEnd, removeStep };
  }, [orderable, queryClient, queryKey, reorder, remove]);
};

export default useStepList;
