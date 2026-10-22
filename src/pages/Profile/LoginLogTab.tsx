import { FC, useMemo, useState } from "react";
import { DatePicker, Select, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import { LoginLogRow, useAccounts, useLoginLog, useMyProfile } from "@/api/useProfile";
import { AccountTag } from "@/components/UserAvatar/UserAvatar";
import { Section } from "./parts";

const { RangePicker } = DatePicker;

/** 登入紀錄: 一般帳號只看自己; ADMIN 可以看全部或挑一個帳號 */
const LoginLogTab: FC = () => {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const isAdmin = profile?.role === "ADMIN";
  const { data: accounts } = useAccounts(isAdmin);
  const [account, setAccount] = useState<string | undefined>(isAdmin ? undefined : profile?.account);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(30, "day").startOf("day"), dayjs()]);

  const query = useMemo(
    () => ({ account, from: range[0].toISOString(), to: range[1].endOf("day").toISOString() }),
    [account, range],
  );
  const { data, isLoading } = useLoginLog(query);

  const columns: TableColumnsType<LoginLogRow> = [
    { title: t("profile.logins.time"), dataIndex: "time", width: 170, render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm:ss") },
    ...(isAdmin
      ? [{ title: t("login.username"), dataIndex: "account", render: (v: string) => <AccountTag account={v} /> }]
      : []),
    {
      title: t("profile.logins.result"),
      render: (_: unknown, r: LoginLogRow) =>
        r.ok ? (
          <Tag color="green">{t("profile.logins.ok")}</Tag>
        ) : (
          <Tag color="red">{t(`profile.logins.reason.${r.reason ?? "wrong_password"}` as never)}</Tag>
        ),
    },
    { title: t("client_name.title"), dataIndex: "clientName", render: (v: string | null) => v ?? "—" },
    { title: "IP", dataIndex: "ip", render: (v: string | null) => v ?? "—" },
  ];

  return (
    <Section
      title={t("profile.logins.title")}
      hint={t("profile.logins.hint")}
      extra={
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {isAdmin && (
            <Select
              allowClear
              showSearch
              style={{ width: 200 }}
              placeholder={t("profile.logins.all_accounts")}
              value={account}
              onChange={setAccount}
              options={(accounts ?? []).map((a) => ({ value: a.account, label: a.account }))}
            />
          )}
          <RangePicker
            value={range}
            allowClear={false}
            onChange={(v) => v?.[0] && v?.[1] && setRange([v[0], v[1]])}
          />
        </div>
      }
    >
      <Table
        size="small"
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 15, size: "small" }}
        scroll={{ x: "max-content" }}
      />
    </Section>
  );
};

export default LoginLogTab;
