import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageInstance } from "antd/es/message/interface";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import { useTranslation } from "react-i18next";

// 原本放在舊模擬頁的 AllCargo/types (那頁已經拿掉)
export type CargoMissionEdit = {
  loc: string;
  directionId: string;
  name: string;
};

export type EditColumn = {
  id: string;
  locationId: string;
  level: number;
};

export const useCargoMutations = (messageApi: MessageInstance) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const editMutation = useMutation({
    mutationFn: (editValue: CargoMissionEdit) =>
      client.post("api/setting/edit-loc", editValue),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["cargoLoc-mission"] }),
        queryClient.refetchQueries({ queryKey: ["locations"] }),
        queryClient.refetchQueries({ queryKey: ["shelf"] }),
      ]);
      void messageApi.success("ok");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editColumnMutation = useMutation({
    mutationFn: ({ locationId, level, id }: EditColumn) =>
      client.post("api/setting/edit-column", { locationId, level, id }),
    onSuccess: async () => {
      void messageApi.success(t("utils.edit_success"));
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["cargoLoc-mission"] }),
        queryClient.refetchQueries({ queryKey: ["locations"] }),
        queryClient.refetchQueries({ queryKey: ["shelf"] }),
      ]);
    },
    onError: (error: Err) => {
      void messageApi.error(
        error.response?.data?.message || t("utils.edit_failed"),
      );
    },
  });

  return {
    editMutation,
    editColumnMutation,
  };
};
