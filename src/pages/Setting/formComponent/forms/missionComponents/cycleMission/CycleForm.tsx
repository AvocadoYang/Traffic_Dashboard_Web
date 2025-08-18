import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import useAllMissionTitles from "@/api/useMissionTitle";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, message, Select } from "antd";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import styled from "styled-components";

const FormContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
`;

const CycleForm: FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [formRegionSample] = Form.useForm();
  const { data: missionTitle } = useAllMissionTitles();
  const { t } = useTranslation();
  const { data: name } = useName();

  const AmrOption: { value: string; label: string }[] = useMemo(() => {
    return (
      name?.amrs.flatMap((m) => ({
        label: `${m.amrId} ${m.isReal ? "" : t("simulate")}`,
        value: m.amrId,
      })) || []
    );
  }, [name, t]);

  const misOptions = useMemo(() => {
    if (!missionTitle) return [];
    return missionTitle
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
  }, [missionTitle]);

  const submitMutation = useMutation({
    mutationFn: (payload: { amrId: string; missionId: string }) => {
      return client.post("api/setting/add-cycle-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = () => {
    const data = formRegionSample.getFieldsValue() as {
      amrId: string;
      missionId: string;
    };

    if (!data.missionId) {
      messageApi.warning(t("mission.cycle_mission.mission_is_required"));
      return;
    }

    submitMutation.mutate(data);
  };

  return (
    <FormContainer>
      <Form
        form={formRegionSample}
        autoComplete="off"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        {contextHolder}
        <Form.Item
          label={t("mission.cycle_mission.mission")}
          name="missionId"
          shouldUpdate
        >
          <Select
            showSearch
            options={misOptions}
            placeholder="Select a mission ok"
          />
        </Form.Item>
        <Form.Item
          label={t("mission.cycle_mission.car")}
          name="amrId"
          shouldUpdate
        >
          <Select
            showSearch
            placeholder="Select a mission ok"
            options={AmrOption}
          />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
          <Button
            icon={<PlusOutlined />}
            onClick={() => submit()}
            color="primary"
            variant="filled"
          >
            {t("utils.submit")}
          </Button>
        </Form.Item>
      </Form>
    </FormContainer>
  );
};

export default CycleForm;
