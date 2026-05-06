import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import useAllMissionTitles from "@/api/useMissionTitle";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, InputNumber, message, Select, Button } from "antd";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { array, object, string } from "yup";
import { PlusOutlined } from "@ant-design/icons";
import styled from "styled-components";

type SubmitPayload = {
  amrId: string[];
  missionId: string;
  preventLocation: string[] | null;
  idle_min: number;
};

const FormContainer = styled.div`
  width: 100%;
  background: #fafafa;
  border: 2px solid #d9d9d9;
  padding: 20px;
  border-left: 4px solid #13c2c2;
`;

const SectionHeader = styled.div`
  background: #e6fffb;
  border: 1px solid #87e8de;
  border-left: 3px solid #13c2c2;
  padding: 8px 12px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #13c2c2;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 16px;
  }

  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }
`;

const IndustrialSelect = styled(Select)`
  font-family: "Roboto Mono", monospace;

  .ant-select-selector {
    height: 40px !important;
    border: 1px solid #d9d9d9 !important;
    border-radius: 0 !important;
    font-size: 12px;
    display: flex;
    align-items: center;

    &:hover {
      border-color: #36cfc9 !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #13c2c2 !important;
    box-shadow: 0 0 0 2px rgba(19, 194, 194, 0.2) !important;
  }
`;

const IndustrialInputNumber = styled(InputNumber)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 40px;
  border-radius: 0;

  .ant-input-number-input {
    height: 38px;
  }

  &:hover {
    border-color: #36cfc9;
  }

  &.ant-input-number-focused {
    border-color: #13c2c2;
    box-shadow: 0 0 0 2px rgba(19, 194, 194, 0.2);
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  background: #13c2c2;
  border-color: #13c2c2;
  color: #ffffff;

  &:hover {
    background: #36cfc9;
    border-color: #36cfc9;
    box-shadow: 0 2px 8px rgba(19, 194, 194, 0.4);
  }
`;

const getIdleSelect = async () => {
  const { data } = await client.get<unknown>(
    "api/setting/idle-task-loc-selection",
  );

  const schema = () =>
    array(
      object({
        label: string().optional(),
        value: string().optional(),
      }),
    ).optional();

  return schema().validate(data, { stripUnknown: true });
};

const IdleMissionForm: FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: name } = useName();
  const { data: missionTitle } = useAllMissionTitles();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: idleLocSelect, isLoading } = useQuery(
    ["idle-task-selection"],
    getIdleSelect,
  );
  const queryClient = useQueryClient();

  const AmrOption: { value: null | string; label: string }[] | undefined =
    useMemo(() => {
      return name?.amrs.map((m) => ({
        label: m.isReal ? m.amrId : `${m.amrId} (${t("simulate")})`,
        value: m.amrId,
      }));
    }, [name, t]);

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
      return client.post("api/setting/add-idle-task", payload);
    },
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({
        queryKey: ["idle-task"],
      });
      form.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = () => {
    const payload = form.getFieldsValue() as SubmitPayload;

    if (payload.amrId.length === 0) {
      messageApi.warning("amrId少填資料");
      return;
    }

    setMissionMutation.mutate(payload);
  };

  return (
    <FormContainer>
      {contextHolder}
      <SectionHeader>
        <PlusOutlined />
        Add Idle Mission Configuration
      </SectionHeader>
      <StyledForm
        form={form}
        onFinish={submit}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        <Form.Item
          label={t("mission.idle_mission.car")}
          name="amrId"
          hasFeedback
          rules={[
            {
              required: true,
              message: t("mission.idle_mission.amr_warn"),
            },
          ]}
        >
          <IndustrialSelect
            mode="multiple"
            options={AmrOption}
            placeholder="Select AMRs"
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        <Form.Item
          label={t("mission.idle_mission.idle_min")}
          name="idle_min"
          hasFeedback
          rules={[
            {
              required: true,
              message: t("utils.required"),
            },
          ]}
        >
          <IndustrialInputNumber
            min={0.5}
            style={{ width: "100%" }}
            addonAfter="min"
          />
        </Form.Item>

        <Form.Item
          label={t("mission.idle_mission.forbidden")}
          name="preventLocation"
          hasFeedback
          rules={[
            {
              required: true,
              message: t("utils.required"),
            },
          ]}
        >
          <IndustrialSelect
            mode="multiple"
            options={idleLocSelect}
            loading={isLoading}
            placeholder="Select forbidden locations"
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        <Form.Item
          label={t("mission.idle_mission.mission")}
          hasFeedback
          name="missionId"
          rules={[
            {
              required: true,
              message: t("utils.required"),
            },
          ]}
        >
          <IndustrialSelect
            options={missionOptions}
            placeholder="Select mission"
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
          <IndustrialButton
            icon={<PlusOutlined />}
            htmlType="submit"
            loading={setMissionMutation.isLoading}
            block
          >
            {t("utils.add")}
          </IndustrialButton>
        </Form.Item>
      </StyledForm>
    </FormContainer>
  );
};

export default IdleMissionForm;
