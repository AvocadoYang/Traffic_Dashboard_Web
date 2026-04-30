import client from "@/api/axiosClient";
import styled from "styled-components";
import { Dispatch, FC, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, message, Modal, Space } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { font } from "@/styles/variables";
// import { buttonVariants } from "@/styles/mixins";
import { useFontFamily } from "@/hooks/useFontFamily";
// import { DefaultButton, PrimaryButton, DangerButton, GhostButton } from "@/styles/mixins";


const IndustrialModal = styled(Modal) <{ $fontFamily: string }>`
  .ant-modal-content {
    background: ${font.color.bg_gray};
    font-family: ${({ $fontFamily }) => $fontFamily};
  }

  .ant-modal-header {
    background: #ffffff;
    border-bottom: 2px solid ${font.color.blue};
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: ${font.color.blue};
    font-family: ${({ $fontFamily }) => $fontFamily};
    font-weight: ${font.weight.bold};
    font-size: ${font.size.xxl};
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ant-modal-body {
    padding: 24px;
    background: ${font.color.bg_gray};
  }

  .ant-form-item-label > label {
    font-family: ${({ $fontFamily }) => $fontFamily};
    font-size: ${font.size.xl};
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${font.color.gray};
    font-weight: ${font.weight.semibold};
  }

  .ant-input,
  .ant-select-selector,
  .ant-input-password {
    font-family: ${({ $fontFamily }) => $fontFamily};
    border: 1px solid ${font.color.white};

    &:hover { border-color: ${font.color.blue}; }

    &:focus {
      border-color: ${font.color.blue};
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-input-affix-wrapper {
    font-family: ${({ $fontFamily }) => $fontFamily};
    border: 1px solid ${font.color.white};

    &:hover { border-color: ${font.color.blue}; }

    &.ant-input-affix-wrapper-focused {
      border-color: ${font.color.blue};
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
`;

// 按鈕樣式
// const IndustrialButton = styled(Button) <{ $fontFamily: string }>`
//   background:${font.color.bg_white_1};;
//   border: 1px solid ${font.color.white};
//   color: ${font.color.gray};
//   font-family: ${({ $fontFamily }) => $fontFamily};
//   text-transform: uppercase;
//   font-size: ${font.size.xl};
//   height: 40px;
//   font-weight: ${font.weight.semibold};
//   gap: 8px;

//   &:hover {
//     background: ${font.color.bg_white_2};
//     border-color: ${font.color.border_gray_1};
//     color: ${font.color.black};
//     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
//   }

//   &.primary {
//     background: ${font.color.blue};
//     border-color: ${font.color.blue};
//     color: ${font.color.bg_white_1};

//     &:hover {
//       background: ${font.color.bg_blue};
//       border-color: ${font.color.blue};
//       box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
//     }
//   }
// `;

const ChangePasswordModal: FC<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}> = ({ open, setOpen }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const fontFamily = useFontFamily();

  const cMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) =>
      client.patch("api/logInAndOut/changePassword", data),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
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
        $fontFamily={fontFamily}  // ← 傳入字體
        title={
          <>
            <LockOutlined /> {t("changePassword.title", "CHANGE PASSWORD")}
          </>
        }
        onCancel={handleClose}
        footer={null}
        destroyOnClose
      >
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
              { min: 6, message: t("utils.passwordMin", "At least 6 characters") },
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
                    new Error(t("changePassword.passwordNotMatch", "Passwords do not match"))
                  );
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          {/* <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <IndustrialButton $fontFamily={fontFamily} onClick={handleClose}>
                {t("utils.cancel", "CANCEL")}
              </IndustrialButton>
              <IndustrialButton
                $fontFamily={fontFamily}
                className="primary"
                htmlType="submit"
                loading={cMutation.isPending}
              >
                {t("utils.confirm", "CONFIRM")}
              </IndustrialButton>
            </Space>
          </Form.Item> */}
          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              {/* <DefaultButton onClick={handleClose}>
                {t("utils.cancel", "CANCEL")}
              </DefaultButton>
              <PrimaryButton
                htmlType="submit"
                loading={cMutation.isPending}
              >
                {t("utils.confirm", "CONFIRM")}
              </PrimaryButton> */}
            </Space>
          </Form.Item>
        </Form>
      </IndustrialModal>
    </>
  );
};

export default ChangePasswordModal;