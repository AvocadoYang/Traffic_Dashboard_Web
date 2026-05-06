// ============= RegisterForm.tsx =============
import client from "@/api/axiosClient";
import useAMRsample from "@/api/useAMRsample";
import { Err } from "@/utils/responseErr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Form, Input, InputNumber, message, Select } from "antd";
import {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SaveOutlined, PlusOutlined } from "@ant-design/icons";

const FormSection = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  padding: 20px;
  border-radius: 4px;
  width: 100%;
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }

  .ant-input,
  .ant-input-number-input {
    font-family: "Roboto Mono", monospace;
    font-size: 12px;

    border-radius: 4px;

    &:hover {
      border-color: #40a9ff;
    }

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
  }

  .ant-input-number {
    width: 100%;
    border: 1px solid #d9d9d9;
    border-radius: 4px;

    &:hover {
      border-color: #40a9ff;
    }

    &:focus-within {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
  }

  .ant-select-selector {
    font-family: "Roboto Mono", monospace !important;
    font-size: 12px !important;
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 36px;
  padding: 0 20px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;

    &:hover:not(:disabled) {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }
  }

  &.ant-btn-default {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;

    &:hover {
      background: #fafafa;
      border-color: #8c8c8c;
      color: #262626;
    }
  }
`;

type When_Finish = {
  id?: string;
  robot_type: string;
  full_name: string;
  serialNum: string;
};

const RegisterForm: FC<{
  isEdit: boolean;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  editData: When_Finish | undefined;
  setEditData: Dispatch<SetStateAction<When_Finish | undefined>>;
}> = ({ isEdit, setIsEdit, editData, setEditData }) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: robotTypes } = useAMRsample();
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: When_Finish) => {
      return client.post("api/setting/create-register-robot", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["all-register-amr"] });
      form.resetFields();
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: (payload: When_Finish) => {
      return client.post("api/setting/edit-register-robot", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["all-register-amr"] });
      form.resetFields();
      setIsEdit(false);
      setEditData(undefined);
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const robotTypeOptions = useMemo(() => {
    return (
      robotTypes?.map((v) => ({
        label: v.name,
        value: v.value,
      })) || []
    );
  }, [robotTypes]);

  const handleCancel = () => {
    form.resetFields();
    setIsEdit(false);
    setEditData(undefined);
  };

  const onFinish = (values: When_Finish) => {
    const paddedFullName = String(values.full_name).padStart(3, "0");
    const prefixAmrName = values.robot_type + "-" + paddedFullName;

    if (isEdit) {
      if (!editData?.id) {
        messageApi.error("ID IS MISSING");
        return;
      }

      const payload = {
        id: editData.id,
        full_name: prefixAmrName,
        serialNum: values.serialNum,
        robot_type: values.robot_type,
      };

      editMutation.mutate(payload);
      return;
    }

    const payload = {
      full_name: prefixAmrName,
      serialNum: values.serialNum,
      robot_type: values.robot_type,
    };
    createMutation.mutate(payload);
  };

  const validateSerialNum = (_: any, value: string) => {
    const serialNumRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (!value || serialNumRegex.test(value)) {
      return Promise.resolve();
    }
    return Promise.reject(
      new Error(t("setting_amr.register_amr.invalid_serial_number"))
    );
  };

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  useEffect(() => {
    if (!isEdit || !editData) return;
    const nameArr = editData.full_name.split("-");
    const numberName = Number(nameArr[nameArr?.length - 1]);

    form.setFieldsValue({
      robot_type: editData?.robot_type,
      full_name: numberName,
      serialNum: editData?.serialNum,
    });
  }, [isEdit, editData]);

  return (
    <FormSection>
      {contextHolder}
      <StyledForm form={form} onFinish={onFinish} layout="vertical">
        <Form.Item
          name="robot_type"
          label={t("setting_amr.register_amr.type")}
          rules={[{ required: true, message: "REQUIRED FIELD" }]}
        >
          <Select
            style={{ width: "100%" }}
            options={robotTypeOptions}
            placeholder="SELECT ROBOT TYPE"
          />
        </Form.Item>

        <Form.Item
          name="full_name"
          label={t("setting_amr.register_amr.amr_name")}
          rules={[{ required: true, message: "REQUIRED FIELD" }]}
        >
          <InputNumber
            placeholder="002"
            max={999}
            min={1}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          name="serialNum"
          label={t("setting_amr.register_amr.serial_number")}
          rules={[
            { required: true, message: t("utils.required") },
            { validator: validateSerialNum },
          ]}
        >
          <Input placeholder="58:11:22:3f:f3:b7" />
        </Form.Item>

        <Form.Item>
          <Flex gap="middle">
            {isEdit && (
              <IndustrialButton onClick={handleCancel}>
                {t("utils.cancel")}
              </IndustrialButton>
            )}

            <IndustrialButton
              type="primary"
              disabled={!submittable}
              htmlType="submit"
              loading={createMutation.isLoading || editMutation.isLoading}
              icon={isEdit ? <SaveOutlined /> : <PlusOutlined />}
            >
              {isEdit ? t("utils.save") : t("utils.add")}
            </IndustrialButton>
          </Flex>
        </Form.Item>
      </StyledForm>
    </FormSection>
  );
};

export default RegisterForm;
