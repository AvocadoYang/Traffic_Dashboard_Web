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

// Industrial Styled Components
const FormContainer = styled.div`
  width: 100%;
  background: #ffffff;
  font-family: "Roboto Mono", monospace;
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 20px;
  }

  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;

    &::before {
      color: #ff4d4f !important;
    }
  }

  .ant-form-item-required::before {
    color: #ff4d4f !important;
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
    transition: all 0.2s;

    &:hover {
      border-color: #40a9ff !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #1890ff !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  }

  .ant-select-selection-placeholder {
    color: #bfbfbf;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }

  .ant-select-selection-item {
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
  }
`;

const IndustrialInputNumber = styled(InputNumber)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 40px;
  border-radius: 0;
  border: 1px solid #d9d9d9;
  transition: all 0.2s;

  .ant-input-number-input {
    height: 38px;
    font-family: "Roboto Mono", monospace;
  }

  &:hover {
    border-color: #40a9ff;
  }

  &.ant-input-number-focused {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  .ant-input-number-handler-wrap {
    border-radius: 0;
  }
`;

const SectionHeader = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #faad14;
  padding: 8px 12px;
  margin-bottom: 16px;
  margin-top: 8px;
  font-family: "Roboto Mono", monospace;
  color: #faad14;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
`;

const ThresholdInfo = styled.div`
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-left: 3px solid #1890ff;
  padding: 12px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  color: #595959;
  line-height: 1.6;

  strong {
    color: #1890ff;
    font-weight: 700;
    text-transform: uppercase;
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
      aggressiveThreshold: number().optional().nullable(),
      fullThreshold: number().optional().nullable(),
      availableGetTaskThreshold: number().optional().nullable(),
      passiveThreshold: number().optional().nullable(),
      titleId: string().optional().nullable(),
      amr: array(
        object({
          fullName: string().optional(),
          id: string().optional(),
          isReal: boolean().optional(),
        }),
      ).optional(),
    }).required();

  const parsed = await schema().validate(data, { stripUnknown: true });

  const amrIds = parsed.amr?.map((r) => r.fullName);

  return {
    id: parsed.id,
    active: parsed.active ?? false,
    aggressiveThreshold: parsed.aggressiveThreshold ?? null,
    fullThreshold: parsed.fullThreshold ?? null,
    availableGetTaskThreshold: parsed.availableGetTaskThreshold ?? null,
    passiveThreshold: parsed.passiveThreshold ?? null,
    titleId: parsed.titleId ? parsed.titleId : null,
    amrIds,
  };
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

  const AmrOption = useMemo(() => {
    return (
      name?.amrs.map((m) => ({
        label: `${m.amrId}${m.isReal ? "" : ` ${t("simulate")}`}`,
        value: m.amrId,
      })) ?? []
    );
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

    form.setFieldsValue({
      amrId: Array.isArray(selectedCharge.amrIds) ? selectedCharge.amrIds : [],
      taskId: selectedCharge.titleId || null,
      aggressiveThreshold: selectedCharge.aggressiveThreshold ?? null,
      passiveThreshold: selectedCharge.passiveThreshold ?? null,
      fullThreshold: selectedCharge.fullThreshold ?? null,
      availableGetTaskThreshold:
        selectedCharge.availableGetTaskThreshold ?? null,
    });
  }, [form, selectKey, selectedCharge]);

  if (isLoading) return <GlobalLoading />;

  return (
    <FormContainer>
      <ThresholdInfo>
        <strong>{t("charge.threshold_note_title")}</strong>{" "}
        {t("charge.threshold_note_desc")}
      </ThresholdInfo>

      <StyledForm
        form={form}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        initialValues={{}}
      >
        <SectionHeader>{t("charge.section_basic")}</SectionHeader>

        <Form.Item
          label={t("charge.amrId")}
          name="amrId"
          rules={[{ required: true, message: t("charge.amrId_required") }]}
        >
          <IndustrialSelect
            mode="multiple"
            options={AmrOption}
            placeholder={t("charge.select_amr")}
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        <Form.Item
          label={t("charge.name")}
          name="taskId"
          rules={[{ required: true, message: t("charge.task_required") }]}
        >
          <IndustrialSelect
            options={taskOption}
            placeholder={t("charge.select_task")}
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        <SectionHeader>{t("charge.section_threshold")}</SectionHeader>

        <Form.Item
          label={t("charge.aggressive")}
          name="aggressiveThreshold"
          rules={[
            { type: "number", max: 70, message: t("charge.aggressive_max") },
          ]}
          tooltip={t("charge.tooltip_aggressive")}
        >
          <IndustrialInputNumber
            min={0}
            max={70}
            style={{ width: "100%" }}
            addonAfter="%"
          />
        </Form.Item>

        <Form.Item
          label={t("charge.passiveThreshold")}
          name="passiveThreshold"
          rules={[
            {
              type: "number",
              max: 40,
              message: t("charge.passiveThreshold_max"),
            },
          ]}
          tooltip={t("charge.tooltip_passive")}
        >
          <IndustrialInputNumber
            min={0}
            max={40}
            style={{ width: "100%" }}
            addonAfter="%"
          />
        </Form.Item>

        <Form.Item
          label={t("charge.full_rate")}
          name="fullThreshold"
          rules={[
            { type: "number", min: 70, message: t("charge.full_rate_min") },
          ]}
          tooltip={t("charge.tooltip_full")}
        >
          <IndustrialInputNumber
            min={70}
            max={100}
            style={{ width: "100%" }}
            addonAfter="%"
          />
        </Form.Item>

        <Form.Item
          label={t("charge.available_get_task")}
          name="availableGetTaskThreshold"
          rules={[
            { type: "number", min: 11, message: t("charge.available_min") },
          ]}
          tooltip={t("charge.tooltip_available_get_task")}
        >
          <IndustrialInputNumber
            min={11}
            max={100}
            style={{ width: "100%" }}
            addonAfter="%"
          />
        </Form.Item>
      </StyledForm>
    </FormContainer>
  );
};

export default ChargeForm;
