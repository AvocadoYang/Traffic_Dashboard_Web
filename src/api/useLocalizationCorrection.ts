import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";

export type LocalizationCorrectionPayload = {
  amrId: string;
  x: number;
  y: number;
  yaw: number;
};

export const useLocalizationCorrection = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const mutation = useMutation({
    mutationFn: (payload: LocalizationCorrectionPayload) =>
      client.post("api/amr/localization", payload),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  return { ...mutation, contextHolder };
};
