// hooks/useCargoMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageInstance } from "antd/es/message/interface";
import type { CargoMissionEdit, EditColumn } from "../types";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

export const useCargoMutations = (messageApi: MessageInstance) => {
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
      void messageApi.success("Edit success");
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["cargoLoc-mission"] }),
        queryClient.refetchQueries({ queryKey: ["locations"] }),
        queryClient.refetchQueries({ queryKey: ["shelf"] }),
      ]);
    },
    onError: (error: Err) => {
      void messageApi.error(
        error.response?.data?.message || "Edit column failed",
      );
    },
  });

  return {
    editMutation,
    editColumnMutation,
  };
};
