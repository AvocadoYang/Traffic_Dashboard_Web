import { FC, useEffect, useState } from "react";
import { Button, Flex, InputNumber, Modal, Typography, message } from "antd";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { useAmrPose } from "@/sockets/useAMRInfo";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler, sanitizeSignedDeg } from "@/utils/utils";

// 跟任務編輯的 yaw 一樣用 -180 ~ 180
const QUICK_YAWS = [0, 90, 180, -90];

/** 車輛卡片的「原地旋轉」: 在車子現在站的點轉到指定角度 */
const SpinModal: FC<{ amrId: string; open: boolean; onClose: () => void }> = ({
  amrId,
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { pose } = useAmrPose(amrId);
  const [yaw, setYaw] = useState<number | null>(null);

  useEffect(() => {
    if (open) setYaw(null);
  }, [open]);

  const spinMutation = useMutation({
    mutationFn: (target: number) => {
      return client.post("/api/amr/spin", { amrId, yaw: target });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const currentYaw = pose ? Math.round(sanitizeSignedDeg(pose.yaw)) : null;

  return (
    <>
      {contextHolder}
      <Modal
        title={`${t("amr_card.spin")} - ${amrId}`}
        open={open}
        onCancel={onClose}
        onOk={() => {
          if (yaw !== null) spinMutation.mutate(yaw);
        }}
        okButtonProps={{
          disabled: yaw === null,
          loading: spinMutation.isLoading,
        }}
      >
        <Flex vertical gap={12}>
          <Typography.Text type="secondary">
            {t("amr_card.spin_hint")}
          </Typography.Text>

          <Typography.Text>
            {t("amr_card.spin_current_yaw")}:{" "}
            {currentYaw === null ? "--" : `${currentYaw}°`}
          </Typography.Text>

          <Flex gap={8} wrap>
            {QUICK_YAWS.map((v) => (
              <Button
                key={v}
                type={yaw === v ? "primary" : "default"}
                onClick={() => setYaw(v)}
              >
                {v}°
              </Button>
            ))}
          </Flex>

          <Flex align="center" gap={8}>
            <Typography.Text>{t("amr_card.spin_target_yaw")}</Typography.Text>
            <InputNumber
              min={-180}
              max={180}
              value={yaw}
              onChange={(v) => setYaw(v)}
              suffix="°"
              style={{ width: 140 }}
            />
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

export default SpinModal;
