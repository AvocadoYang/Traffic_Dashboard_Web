import { FC, useEffect, useMemo, useState } from "react";
import { Button, Flex, message, Modal, Select, Typography } from "antd";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

export type RedispatchTarget = {
  missionId: string;
  titleName: string;
  /** 當初指定的車; "none" 是不指定 */
  amrId: string;
};

const NO_AMR = "none";

// 任務歷史的「重新派發」: 把派過的設定任務再派一次, 派之前可以換車
const RedispatchModal: FC<{
  target: RedispatchTarget | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ target, onClose, onDone }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: name } = useName();
  const [amrId, setAmrId] = useState(NO_AMR);

  // 跟派任務視窗一樣: 模擬中只列模擬車, 否則只列實車
  const options = useMemo(() => {
    const amrs = (name?.amrs ?? [])
      .filter((a) => a.isReal === !name?.isSim)
      .map((a) => ({ label: a.amrId, value: a.amrId }));
    return [...amrs, { value: NO_AMR, label: t("utils.random") }];
  }, [name, t]);

  // 當初那台車現在不在清單裡 (下線、切到模擬) 就退回不指定
  useEffect(() => {
    if (!target) return;
    setAmrId(
      options.some((o) => o.value === target.amrId) ? target.amrId : NO_AMR,
    );
  }, [target, options]);

  const mutation = useMutation({
    mutationFn: () =>
      client.post<{ isSuccess?: boolean }>("api/missions/redispatch", {
        missionId: target?.missionId,
        amrId,
      }),
    onSuccess: ({ data }) => {
      // MiR 任務一定要指定車, 後端這種情況回 200 + isSuccess: false
      if (data?.isSuccess === false) {
        void messageApi.error(t("mission_history.redispatch_need_amr"));
        return;
      }
      void messageApi.success(t("mission_history.redispatch_success"));
      onDone();
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  return (
    <>
      {contextHolder}
      <Modal
        open={!!target}
        title={t("mission_history.redispatch")}
        onCancel={onClose}
        destroyOnClose
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={onClose}>{t("utils.cancel")}</Button>
            <Button
              type="primary"
              loading={mutation.isLoading}
              onClick={() => mutation.mutate()}
            >
              {t("mission_history.redispatch")}
            </Button>
          </Flex>
        }
      >
        <Flex vertical gap={12}>
          <div>
            <Typography.Text type="secondary">
              {t("mission_history.full_name")}
            </Typography.Text>
            <div>
              <Typography.Text strong>{target?.titleName}</Typography.Text>
            </div>
          </div>
          <div>
            <Typography.Text type="secondary">
              {t("mission_history.vehicle")}
            </Typography.Text>
            <Select
              style={{ width: "100%" }}
              options={options}
              value={amrId}
              onChange={setAmrId}
            />
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("mission_history.redispatch_hint")}
          </Typography.Text>
        </Flex>
      </Modal>
    </>
  );
};

export default RedispatchModal;
