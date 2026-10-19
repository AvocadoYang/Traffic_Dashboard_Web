import { FC, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, KeyOutlined, UserAddOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { AccountRow, Role, useAccounts, useMyProfile } from "@/api/useProfile";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import CreateUserModel from "@/components/CreateUserModel";
import { Section } from "./parts";

type ApiError = { response?: { data?: { message?: string } } };

const ASSIGNABLE: Role[] = ["GENERALLY", "ENGINEER"];

/**
 * 帳號管理 (只有 ADMIN 看得到): 列表、改角色、停用、重設密碼、刪除。
 * ADMIN 帳號和自己不能在這裡改 (後端也擋), 自己的密碼在「個人資料」改。
 */
const AccountsTab: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const qc = useQueryClient();
  const { data: me } = useMyProfile();
  const { data: accounts, isLoading } = useAccounts(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [resetFor, setResetFor] = useState<AccountRow | null>(null);

  // 新增使用者的視窗關掉後重新抓一次列表
  useEffect(() => {
    if (!openCreate) void qc.invalidateQueries({ queryKey: ["accounts"] });
  }, [openCreate, qc]);

  const onError = (e: ApiError) => void messageApi.error(e.response?.data?.message ?? t("profile.save_failed"));
  const done = () => {
    void messageApi.success(t("profile.saved"));
    void qc.invalidateQueries({ queryKey: ["accounts"] });
    void qc.invalidateQueries({ queryKey: ["profile", "avatars"] });
  };

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: Role; disabled?: boolean }) =>
      client.patch(`api/logInAndOut/users/${encodeURIComponent(id)}`, body),
    onSuccess: done,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => client.delete(`api/logInAndOut/users/${encodeURIComponent(id)}`),
    onSuccess: done,
    onError,
  });

  const locked = (r: AccountRow) => r.role === "ADMIN" || r.id === me?.id;

  const columns: TableColumnsType<AccountRow> = [
    {
      title: t("login.username"),
      dataIndex: "account",
      render: (_, r) => (
        <Space>
          <UserAvatar avatar={r.avatar} account={r.account} size={28} />
          <strong>{r.account}</strong>
          {r.id === me?.id && <Tag>{t("profile.accounts.you")}</Tag>}
        </Space>
      ),
    },
    {
      title: t("create_user.role"),
      dataIndex: "role",
      width: 160,
      render: (role: Role, r) =>
        locked(r) ? (
          t(`profile.role.${role}`)
        ) : (
          <Select
            size="small"
            style={{ width: 130 }}
            value={role}
            onChange={(next: Role) => update.mutate({ id: r.id, role: next })}
            options={ASSIGNABLE.map((x) => ({ value: x, label: t(`profile.role.${x}`) }))}
          />
        ),
    },
    {
      title: t("profile.accounts.enabled"),
      width: 90,
      render: (_, r) => (
        <Switch
          size="small"
          checked={!r.disabled}
          disabled={locked(r)}
          onChange={(checked) => update.mutate({ id: r.id, disabled: !checked })}
        />
      ),
    },
    {
      title: t("profile.accounts.last_login"),
      dataIndex: "lastLoginAt",
      width: 170,
      render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "",
      width: 200,
      render: (_, r) =>
        locked(r) ? null : (
          <Space size={4}>
            <Button size="small" icon={<KeyOutlined />} onClick={() => setResetFor(r)}>
              {t("profile.accounts.reset_password")}
            </Button>
            <Popconfirm
              title={t("profile.accounts.delete_confirm", { account: r.account })}
              okButtonProps={{ danger: true }}
              onConfirm={() => remove.mutate(r.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} aria-label={t("utils.delete")} />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Section
        title={t("profile.accounts.title")}
        hint={t("profile.accounts.hint")}
        extra={
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setOpenCreate(true)}>
            {t("create_user.title")}
          </Button>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={isLoading}
          dataSource={accounts ?? []}
          columns={columns}
          pagination={false}
          scroll={{ x: "max-content" }}
        />
      </Section>
      <CreateUserModel open={openCreate} setOpen={setOpenCreate} />
      <ResetPasswordModal account={resetFor} onClose={() => setResetFor(null)} onDone={done} onError={onError} />
    </>
  );
};

const ResetPasswordModal: FC<{
  account: AccountRow | null;
  onClose: () => void;
  onDone: () => void;
  onError: (e: ApiError) => void;
}> = ({ account, onClose, onDone, onError }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ newPassword: string; confirm: string }>();
  const reset = useMutation({
    mutationFn: (newPassword: string) =>
      client.post(`api/logInAndOut/users/${encodeURIComponent(account!.id)}/reset-password`, { newPassword }),
    onSuccess: () => {
      onDone();
      form.resetFields();
      onClose();
    },
    onError,
  });

  return (
    <Modal
      open={!!account}
      title={t("profile.accounts.reset_title", { account: account?.account })}
      okText={t("utils.save")}
      confirmLoading={reset.isLoading}
      onOk={() => void form.validateFields().then((v) => reset.mutate(v.newPassword))}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="newPassword"
          label={t("create_user.password")}
          rules={[
            { required: true, message: t("create_user.passwordMin") },
            { min: 8, message: t("create_user.passwordMin") },
            { pattern: /^(?=.*[a-z])(?=.*[A-Z])/, message: t("create_user.passwordCase") },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={t("profile.accounts.confirm_password")}
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: t("profile.accounts.password_mismatch") },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || v === getFieldValue("newPassword")
                  ? Promise.resolve()
                  : Promise.reject(new Error(t("profile.accounts.password_mismatch"))),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AccountsTab;
