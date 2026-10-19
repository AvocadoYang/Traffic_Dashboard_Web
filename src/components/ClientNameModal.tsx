import { Form, Input, message, Space, Typography } from "antd";
import { Dispatch, FC, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { DesktopOutlined } from "@ant-design/icons";
import { IndustrialButton, IndustrialModal } from "./ChangePasswordModal";
import {
  CLIENT_NAME_MAX_LENGTH,
  getClientId,
  getClientName,
  setClientName,
} from "@/utils/clientIdentity";

// 幫這台電腦取名字。同一個帳號在好幾台電腦登入時, 任務紀錄靠這個名稱分辨是哪台派的。
// 名稱只存在這個瀏覽器, 不是帳號的設定。
const ClientNameModal: FC<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onSaved?: (name: string) => void;
}> = ({ open, setOpen, onSaved }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string }>();

  const handleSubmit = ({ name }: { name?: string }) => {
    const saved = setClientName(name ?? "");
    onSaved?.(saved);
    messageApi.success(t("utils.success"));
    setOpen(false);
  };

  return (
    <>
      {contextHolder}
      {open && (
        <IndustrialModal
          open
          title={
            <>
              <DesktopOutlined /> {t("client_name.title")}
            </>
          }
          onCancel={() => setOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ name: getClientName() }}
            onFinish={handleSubmit}
          >
            <Form.Item
              label={t("client_name.label")}
              name="name"
              extra={t("client_name.hint")}
            >
              <Input
                maxLength={CLIENT_NAME_MAX_LENGTH}
                placeholder={t("client_name.placeholder")}
                allowClear
                autoFocus
              />
            </Form.Item>

            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t("client_name.id")}: {getClientId().slice(0, 8) || "—"}
            </Typography.Text>

            <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <IndustrialButton onClick={() => setOpen(false)}>
                  {t("utils.cancel", "CANCEL")}
                </IndustrialButton>
                <IndustrialButton className="primary" htmlType="submit">
                  {t("utils.confirm", "CONFIRM")}
                </IndustrialButton>
              </Space>
            </Form.Item>
          </Form>
        </IndustrialModal>
      )}
    </>
  );
};

export default ClientNameModal;
