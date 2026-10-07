import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageInstance } from "antd/es/message/interface";
import type {
  CargoMissionEdit,
  EditColumn,
} from "../pages/Simulate/mapComponents/components/AllCargo.tsx/types";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import { useTranslation } from "react-i18next";

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
