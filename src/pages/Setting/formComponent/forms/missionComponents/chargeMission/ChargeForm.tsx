import { Form, FormInstance, InputNumber, Select } from "antd";
import { FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { array, boolean, number, object, string } from "yup";
import client from "@/api/axiosClient";
import useAllMissionTitles from "@/api/useMissionTitle";
import useName from "@/api/useAmrName";
import GlobalLoading from "@/utils/GlobalLoading";
import styled from "styled-components";

// Styled container for the form
const FormContainer = styled.div`
  width: 100%;
  max-width: 1000px; /* Wide form, adjust as needed */
  margin: 0 auto;
  padding: 24px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

// Styled Form to override Ant Design defaults
const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 16px; /* Consistent spacing between items */
  }
  .ant-form-item-label > label {
    font-weight: 500; /* Bolder labels for readability */
    color: #333;
  }
  .ant-select,
  .ant-input-number {
    border-radius: 4px; /* Rounded corners */
    transition: all 0.3s; /* Smooth hover effects */
  }
  .ant-select:hover,
  .ant-input-number:hover {
    border-color: #1890ff; /* Ant Design primary color on hover */
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
  .ant-select-selector {
    height: 40px !important; /* Larger Select inputs */
    padding: 4px 11px !important;
  }
  .ant-input-number-input {
    height: 38px; /* Match Select height */
    padding: 4px 11px;
  }
`;

const getSelectedCharge = async (id: string) => {
  const { data } = await client.get<unknown>(
    `api/setting/selected-charge?id=${id}`,
  );

  const schema = () =>
    object({
      id: string().required(),
      active: boolean().optional().nullable(),
      amrIds: array(string().optional()).optional(),
      aggressiveThreshold: number().optional().nullable(),
      fullThreshold: number().optional().nullable(),
      passiveFullThreshold: number().optional().nullable(),
      passiveWaitTime: number().optional().nullable(),
      availableGetTaskThreshold: number().optional().nullable(),
      autoTimeZone: string().optional().nullable(),
      missionTitleId: string().optional().nullable(),
    }).required();

  return schema().validate(data, { stripUnknown: true });
};

const ChargeForm: FC<{ form: FormInstance<unknown>; selectKey: string }> = ({
  form,
  selectKey,
}) => {
  const { data: selectedCharge, isLoading } = useQuery(
    ["select-charge", selectKey],
    () => getSelectedCharge(selectKey),
    {
      enabled: !!selectKey,
    },
  );
  const { data: missionTitle } = useAllMissionTitles();
  const { t } = useTranslation();
  const { data: name } = useName();

  const AmrOption: { value: null | string; label: string }[] | undefined =
    useMemo(() => {
      return name?.amrs.map((m) => ({
        label: `${m.amrId} ${m.isReal ? "" : t("simulate")}`,
        value: m.amrId,
      }));
    }, [name, t]);

  const taskOption = missionTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "charge",
      ),
    )
    .map((v) => {
      return { value: v.id, label: v.name };
    });

  useEffect(() => {
    if (!selectKey || !selectedCharge) return;

    form.setFieldValue("amrId", selectedCharge?.amrIds);
    form.setFieldValue("taskId", selectedCharge.missionTitleId);
    form.setFieldValue(
      "aggressiveThreshold",
      selectedCharge?.aggressiveThreshold,
    );
    form.setFieldValue("fullThreshold", selectedCharge?.fullThreshold);
    form.setFieldValue(
      "availableGetTaskThreshold",
      selectedCharge?.availableGetTaskThreshold,
    );
  }, [form, selectKey, selectedCharge]);

  if (isLoading) return <GlobalLoading />;

  return (
    <FormContainer>
      <StyledForm
        form={form}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={{}}
      >
        <Form.Item
          label={t("charge.amrId")}
          name="amrId"
          rules={[{ required: true, message: t("charge.amrId_required") }]}
        >
          <Select
            mode="multiple"
            options={AmrOption}
            placeholder={t("charge.select_amr")}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          label={t("charge.name")}
          name="taskId"
          rules={[{ required: true, message: t("charge.task_required") }]}
        >
          <Select
            options={taskOption}
            placeholder={t("charge.select_task")}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          label={t("charge.aggressive")}
          name="aggressiveThreshold"
          rules={[
            { type: "number", max: 70, message: t("charge.aggressive_max") },
          ]}
        >
          <InputNumber min={0} max={70} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label={t("charge.full_rate")}
          name="fullThreshold"
          rules={[
            { type: "number", min: 70, message: t("charge.full_rate_min") },
          ]}
        >
          <InputNumber min={70} max={100} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label={t("charge.available_get_task")}
          name="availableGetTaskThreshold"
          rules={[
            { type: "number", min: 11, message: t("charge.available_min") },
          ]}
        >
          <InputNumber min={11} max={100} style={{ width: "100%" }} />
        </Form.Item>
      </StyledForm>
    </FormContainer>
  );
};

export default ChargeForm;
