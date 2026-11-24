import { FC, useState } from "react";
import { Modal } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/atoms/map/mapSelectionAtoms";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { Field, FieldLabel, Hint } from "@/pages/SettingV3/ui/primitives";
import {
  IncludeMissionSelect,
  useIncludeMissionOptions,
} from "./includeMission";
import { STEP_QUERY_BASE } from "./useStepMutations";

type Props = {
  open: boolean;
  missionId: string;
  robotValue: string;
  messageApi: MessageInstance;
  onClose: () => void;
};

/**
 * 引用任務: 在最後面加一項「固定指向另一個任務」的步驟。
 * 跟引入(複製步驟)不同, 這裡不複製, 原任務改了這裡跟著變。
 */
const IncludeStepModal: FC<Props> = ({
  open,
  missionId,
  robotValue,
  messageApi,
  onClose,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const { groups } = useIncludeMissionOptions(missionId, robotValue);
  const [pick, setPick] = useState<string | undefined>();

  const add = useMutation({
    mutationFn: (includeTitleId: string) =>
      client.post("api/setting/add-include-task", {
        key: missionId,
        includeTitleId,
        currentMapId: currentMapId || "",
      }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({
        queryKey: [STEP_QUERY_BASE, missionId],
      });
      close();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const close = () => {
    setPick(undefined);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={t("setting_v2.mission.include_button")}
      onCancel={close}
      onOk={() => pick && add.mutate(pick)}
      okButtonProps={{ disabled: !pick }}
      confirmLoading={add.isLoading}
      okText={t("utils.confirm")}
      cancelText={t("utils.cancel")}
      destroyOnHidden
    >
      <Hint style={{ marginBottom: 12 }}>
        {t("setting_v2.mission.include_hint")}
      </Hint>
      <Field>
        <FieldLabel>{t("mission.add_mission.title")}</FieldLabel>
        <IncludeMissionSelect groups={groups} value={pick} onChange={setPick} />
      </Field>
    </Modal>
  );
};

export default IncludeStepModal;
