import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, message, Modal, Space } from "antd";
import { Dispatch, FC, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { LockOutlined } from "@ant-design/icons";

export const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: var(--c-bg-subtle);
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-header {
    background: var(--c-bg);
    border-bottom: 2px solid var(--c-header-accent);
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: var(--c-header-accent);
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
    background: var(--c-bg-subtle);
  }

  .ant-form-item-label > label {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--c-text-secondary);
    font-weight: 600;
  }

  .ant-input,
  .ant-select-selector,
  .ant-input-password {
    font-family: "Roboto Mono", monospace;
    border: 1px solid var(--c-header-border);

    &:hover {
      border-color: var(--c-header-accent);
    }

    &:focus {
      border-color: var(--c-header-accent);
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-input-affix-wrapper {
    font-family: "Roboto Mono", monospace;
    border: 1px solid var(--c-header-border);

    &:hover {
      border-color: var(--c-header-accent);
    }

    &.ant-input-affix-wrapper-focused {
      border-color: var(--c-header-accent);
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
`;

export const IndustrialButton = styled(Button)`
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  color: var(--c-text-secondary);
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;

  &:hover {
    background: var(--c-bg-subtle);
    border-color: var(--c-text-muted);
    color: var(--c-text);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.primary {
    background: var(--c-header-accent);
    border-color: var(--c-header-accent);
    color: #ffffff;

    &:hover {
      background: var(--c-header-accent);
      border-color: var(--c-header-accent);
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }
`;

const ChangePasswordModal: FC<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  /** 還在用預設密碼: 標題改成提醒, 多一個「7 天後再提醒」(見 UserSession/PasswordReminder) */
  reminder?: boolean;
}> = ({ open, setOpen, reminder = false }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const cMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) =>
      client.patch<{ token?: string }>("api/logInAndOut/changePassword", data),
    onSuccess: (res) => {
      // 後端回一張新的 token (拿掉「預設密碼提醒」的標記)
      if (res.data?.token) localStorage.setItem("token", res.data.token);
      messageApi.success(t("utils.success"));
      form.resetFields();
      setOpen(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 7 天後再提醒: 後端記下時間, 回一張沒有提醒標記的 token (重新整理也不會再跳)
  const snoozeMutation = useMutation({
    mutationFn: () => client.post<{ token?: string }>("api/logInAndOut/password-reminder/snooze"),
    onSuccess: (res) => {
      if (res.data?.token) localStorage.setItem("token", res.data.token);
      form.resetFields();
      setOpen(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleClose = () => {
    form.resetFields();
    setOpen(false);
  };

  const handleSubmit = (values: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    cMutation.mutate({
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    });
  };

  if (!open) return null;

  return (
    <>
      {contextHolder}
      <IndustrialModal
        open
        title={
          <>
            <LockOutlined />{" "}
            {reminder
              ? t("changePassword.reminderTitle")
              : t("changePassword.title", "CHANGE PASSWORD")}
          </>
        }
        onCancel={handleClose}
        // 提醒視窗不要點旁邊就關掉: 改密碼、按略過, 或右上角關 (下次開頁面再提醒)
        maskClosable={!reminder}
        footer={null}
        destroyOnClose
      >
        {reminder && <p>{t("changePassword.reminderHint")}</p>}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={t("changePassword.oldPassword", "OLD PASSWORD")}
            name="oldPassword"
            rules={[{ required: true, message: t("utils.required") }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label={t("changePassword.newPassword", "NEW PASSWORD")}
            name="newPassword"
            rules={[
              { required: true, message: t("utils.required") },
              // 跟後端 checkPasswordRule 一樣: 至少 8 碼, 有大寫和小寫
              {
                min: 8,
                message: t("utils.passwordMin", "At least 8 characters"),
              },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])/,
                message: t("changePassword.rule"),
              },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label={t("changePassword.confirmPassword", "CONFIRM PASSWORD")}
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: t("utils.required") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      t(
                        "changePassword.passwordNotMatch",
                        "Passwords do not match"
                      )
                    )
                  );
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              {reminder ? (
                <IndustrialButton
                  onClick={() => snoozeMutation.mutate()}
                  loading={snoozeMutation.isPending}
                >
                  {t("changePassword.remindLater")}
                </IndustrialButton>
              ) : (
                <IndustrialButton onClick={handleClose}>
                  {t("utils.cancel", "CANCEL")}
                </IndustrialButton>
              )}
              <IndustrialButton
                className="primary"
                htmlType="submit"
                loading={cMutation.isPending}
              >
                {t("utils.confirm", "CONFIRM")}
              </IndustrialButton>
            </Space>
          </Form.Item>
        </Form>
      </IndustrialModal>
    </>
  );
};

export default ChangePasswordModal;
