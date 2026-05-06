import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import useAllMissionTitles from "@/api/useMissionTitle";
import { ErrorResponse } from "@/utils/globalType";
import SubmitButton from "@/utils/SubmitButton";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, message, Select } from "antd";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

type SubmitPayload = {
  amrId: string[];
  missionId: string;
};
const Wrapper = styled.div`
  min-width: 600px;
`;

const AbortCargoMissionForm: FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: name } = useName();
  const { data: missionTitle } = useAllMissionTitles();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const AmrOption: { value: null | string; label: string }[] | undefined =
    useMemo(() => {
      return name?.amrs.map((m) => ({
        label: `${m.amrId} ${m.isReal ? [] : t("simulate")}`,
        value: m.amrId,
      }));
    }, [name]);

  const missionOptions = missionTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "normal-mission",
      ),
    )
    .map((v) => {
      return {
        value: v.id,
        label: v.name,
      };
    });

  const setMissionMutation = useMutation({
    mutationFn: (payload: SubmitPayload) => {
      return client.post("api/setting/add-abort-when-has-cargo", payload);
    },
    onSuccess: async () => {
      (queryClient.refetchQueries({
        queryKey: ["abort-mission-when-has-cargo"],
      }),
        void messageApi.success(t("utils.success")));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = () => {
    const payload = form.getFieldsValue() as SubmitPayload;

    if (!payload.amrId || payload.amrId.length === 0) {
      messageApi.warning(
        `amrId${t("mission.abort_mission_when_has_cargo_mission.amr_warn")}`,
      );
      return;
    }

    for (const key of Object.keys(payload) as Array<keyof SubmitPayload>) {
      if (payload[key] === null) {
        messageApi.warning(
          `${key}${t("mission.abort_mission_when_has_cargo_mission.missed")}`,
        );
        return;
      }
    }
    setMissionMutation.mutate(payload);
  };

  return (
    <Wrapper>
      {contextHolder}

      <Form form={form}>
        <Form.Item
          label={t("mission.abort_mission_when_has_cargo_mission.car")}
          name="amrId"
          hasFeedback
          rules={[
            {
              required: true,
              message: t("utils.required"),
            },
          ]}
        >
          <Select mode="multiple" options={AmrOption} />
        </Form.Item>

        <Form.Item
          label={t("mission.abort_mission_when_has_cargo_mission.mission")}
          name="missionId"
          hasFeedback
          rules={[
            {
              required: true,
              message: t("utils.required"),
            },
          ]}
        >
          <Select options={missionOptions} />
        </Form.Item>
        <Form.Item>
          <SubmitButton form={form} isModel={false} onOk={submit} />
        </Form.Item>
      </Form>
    </Wrapper>
  );
};

export default AbortCargoMissionForm;
