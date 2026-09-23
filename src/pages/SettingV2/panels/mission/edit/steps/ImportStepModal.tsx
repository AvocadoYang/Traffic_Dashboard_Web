import { FC, useMemo, useState } from "react";
import { Modal, Select } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAllMissionTitlesDetail from "@/api/useMissionTitleDetail";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { isFork, isMir } from "@/utils/globalFunction";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { Field, FieldLabel, Hint } from "../../../../ui/primitives";
import { STEP_QUERY_BASE } from "./useStepMutations";

type Props = {
  /** 要插在哪一個步驟後面。null 代表關閉 */
  target: { missionId: string; afterOrder: number } | null;
  /** 目前這個任務綁的車型,用來過濾可引入的任務 */
  robotValue: string;
  messageApi: MessageInstance;
  onClose: () => void;
};

/**
 * 把另一個任務的步驟整串複製進目前任務的指定位置。只列得出同車型的任務。
 */
const ImportStepModal: FC<Props> = ({
  target,
  robotValue,
  messageApi,
  onClose,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const { data } = useAllMissionTitlesDetail();
  const [pick, setPick] = useState<string | undefined>();

  /** 只列同車型的任務,不同車型的步驟格式不相容 */
  const options = useMemo(() => {
    const sameKind = (value: string) => {
      if (isFork(robotValue)) return isFork(value);
      if (isMir(robotValue)) return isMir(value);
      return false;
    };
    return (data ?? [])
      .filter(
        (v) =>
          v.id !== target?.missionId && sameKind(v.Robot_types?.value ?? ""),
      )
      .map((v) => ({ value: v.id, label: v.name }));
  }, [data, robotValue, target?.missionId]);

  const importMutation = useMutation({
    mutationFn: (importTaskId: string) =>
      client.post("api/setting/import-task", {
        importTaskId,
        currentTaskId: target?.missionId,
        order: target?.afterOrder,
        currentMapId: currentMapId || "",
      }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({
        queryKey: [STEP_QUERY_BASE, target?.missionId],
      });
      setPick(undefined);
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const close = () => {
    setPick(undefined);
    onClose();
  };

  return (
    <Modal
      open={!!target}
      title={t("mission.task_table.import_mission")}
      onCancel={close}
      onOk={() => pick && importMutation.mutate(pick)}
      okButtonProps={{ disabled: !pick }}
      confirmLoading={importMutation.isLoading}
      okText={t("utils.confirm")}
      cancelText={t("utils.cancel")}
      destroyOnHidden
    >
      <Hint style={{ marginBottom: 12 }}>
        {`會把選到的任務的所有步驟,整串插在第 ${target?.afterOrder ?? 0} 個位置。只列得出同車型的任務。`}
      </Hint>

      <Field>
        <FieldLabel>{t("mission.add_mission.title")}</FieldLabel>
        <Select
          value={pick}
          onChange={setPick}
          options={options}
          placeholder={t("utils.select")}
          style={{ width: "100%" }}
          showSearch={{
            filterOption: (input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
          }}
          notFoundContent={<Hint>沒有同車型的任務可以引入</Hint>}
        />
      </Field>
    </Modal>
  );
};

export default ImportStepModal;
