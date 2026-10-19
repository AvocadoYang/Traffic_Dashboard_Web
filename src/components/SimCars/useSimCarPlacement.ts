import { DragEvent, MutableRefObject, useCallback } from "react";
import { message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import type { CanvasMapApi } from "@/components/CanvasMap/CanvasMap";

/** 拖曳模擬車時 dataTransfer 裡放車的 id 用的類型 */
export const SIM_CAR_DRAG_TYPE = "application/x-sim-car";

export const refetchSimCars = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.refetchQueries({ queryKey: ["script-robot"] });
  void queryClient.refetchQueries({ queryKey: ["mock-robot"] });
};

/**
 * 地圖區塊接住拖過來的模擬車: 放到離游標最近的點位 (跟舊模擬頁一樣),
 * 那個點位已經有別台模擬車就不放。
 */
const useSimCarPlacement = (apiRef: MutableRefObject<CanvasMapApi | null>) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const placeMutation = useMutation({
    mutationFn: async ({ id, locationId }: { id: string; locationId: string }) => {
      const { data } = await client.post<{ isRegister: boolean }>(
        "api/simulate/is-place-has-robot",
        { locationId },
      );
      if (data.isRegister) return false;
      await client.post("api/simulate/edit-robot-placement", {
        script_placement_location: locationId,
        id,
      });
      return true;
    },
    onSuccess: (placed) => {
      if (!placed) {
        void messageApi.warning(t("sim.robot.no_overlapping"));
        return;
      }
      refetchSimCars(queryClient);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const onDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(SIM_CAR_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      const id = e.dataTransfer.getData(SIM_CAR_DRAG_TYPE);
      if (!id) return;
      e.preventDefault();
      const locationId = apiRef.current?.nearestPointAt(e.clientX, e.clientY);
      if (!locationId) {
        void messageApi.warning(t("sim.edit_location_first"));
        return;
      }
      placeMutation.mutate({ id, locationId });
    },
    [apiRef, messageApi, placeMutation, t],
  );

  return { onDragOver, onDrop, contextHolder };
};

export default useSimCarPlacement;
