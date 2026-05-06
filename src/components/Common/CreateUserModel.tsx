import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, message, Modal, Select, Space } from "antd";
import React, { Dispatch, FC, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { UserAddOutlined } from "@ant-design/icons";

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #f5f5f5;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-header {
    background: #ffffff;
    border-bottom: 2px solid #1890ff;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #1890ff;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ant-modal-body {
    padding: 24px;
    background: #f5f5f5;
  }

  .ant-form-item-label > label {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #595959;
    font-weight: 600;
  }

  .ant-input,
  .ant-select-selector,
  .ant-input-password {
    font-family: "Roboto Mono", monospace;
    border: 1px solid #d9d9d9;

    &:hover {
      border-color: #1890ff;
    }

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-input-affix-wrapper {
    font-family: "Roboto Mono", monospace;
    border: 1px solid #d9d9d9;

    &:hover {
      border-color: #1890ff;
    }

    &.ant-input-affix-wrapper-focused {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #595959;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;

  &:hover {
    background: #fafafa;
    border-color: #8c8c8c;
    color: #262626;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }
`;
const CreateUserModel: FC<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}> = ({ open, setOpen }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const handleClose = () => {
    form.resetFields();
    setOpen(false);
  };

  // Define roles with translation keys
  const roleOptions = [
    { label: t("create_user.roles.GENERALLY"), value: "GENERALLY" },
    { label: t("create_user.roles.ENGINEER"), value: "ENGINEER" },
  ];

  const cMutation = useMutation({
    mutationFn: (data: { username: string; password: string; role: string }) =>
      client.post("api/logInAndOut/register", data),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  if (!open) return null;

  return (
    <>
      {contextHolder}
      <IndustrialModal
        open
        title={
          <>
            <UserAddOutlined /> {t("create_user.title")}
          </>
        }
        onCancel={handleClose}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => cMutation.mutate(v)}
        >
          <Form.Item
            label={t("create_user.username")}
            name="username"
            rules={[{ required: true, message: t("utils.required") }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={t("create_user.password")}
            name="password"
            rules={[
              { required: true, message: t("utils.required") },
              { min: 8, message: t("create_user.passwordMin") },
              {
                pattern: /^\S+$/,
                message: t("create_user.passwordNoSpace"),
              },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])/,
                message: t("create_user.passwordCase"),
              },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label={t("create_user.role")}
            name="role"
            rules={[{ required: true, message: t("utils.required") }]}
          >
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <IndustrialButton onClick={handleClose}>
                {t("utils.cancel")}
              </IndustrialButton>
              <IndustrialButton
                className="primary"
                htmlType="submit"
                loading={cMutation.isPending}
              >
                {t("utils.confirm")}
              </IndustrialButton>
            </Space>
          </Form.Item>
        </Form>
      </IndustrialModal>
    </>
  );
};

export default CreateUserModel;
