import { FC, useEffect, useState } from "react";
import { Alert, Button, Checkbox, Modal, Space, Table, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { AccountRow } from "@/api/useProfile";
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_GROUPS,
  SETTING_PERMISSION_ROWS,
  permissionLabelKey,
} from "@/utils/permissions";

/**
 * 帳號的功能權限: 一組一個勾選清單, 設定頁一個分類一列 (看 / 改)。
 * 勾「改」會一起勾「看」, 取消「看」會一起取消「改」 (能改看不到的東西沒有意義)。
 * 沒設過 (null) 的帳號打開時全部是勾的。
 */
const PermissionModal: FC<{
  account: AccountRow | null;
  saving: boolean;
  onClose: () => void;
  onSave: (permissions: string[] | null) => void;
}> = ({ account, saving, onClose, onSave }) => {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (account) setChecked(new Set(account.permissions ?? ALL_PERMISSION_KEYS));
  }, [account]);

  const toggle = (on: boolean, ...keys: string[]) =>
    setChecked((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const groupState = (keys: string[]) => {
    const n = keys.filter((k) => checked.has(k)).length;
    return { all: n === keys.length, some: n > 0 && n < keys.length };
  };

  const settingKeys = SETTING_PERMISSION_ROWS.flatMap((r) => [r.view, r.edit].filter((k): k is string => !!k));
  const settingAll = groupState(settingKeys);

  const save = () => {
    // 全勾 = 存 null (跟沒設過一樣), 以後新增的功能也會自動有
    const all = ALL_PERMISSION_KEYS.every((k) => checked.has(k));
    onSave(all ? null : ALL_PERMISSION_KEYS.filter((k) => checked.has(k)));
  };

  return (
    <Modal
      open={!!account}
      width={720}
      title={t("permission.title", { account: account?.account })}
      onCancel={onClose}
      destroyOnHidden
      footer={
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Space>
            <Button size="small" onClick={() => setChecked(new Set(ALL_PERMISSION_KEYS))}>
              {t("permission.check_all")}
            </Button>
            <Button size="small" onClick={() => setChecked(new Set())}>
              {t("permission.uncheck_all")}
            </Button>
          </Space>
          <Space>
            <Button onClick={onClose}>{t("utils.cancel")}</Button>
            <Button type="primary" loading={saving} onClick={save}>
              {t("utils.save")}
            </Button>
          </Space>
        </Space>
      }
    >
      <Alert type="info" showIcon style={{ marginBottom: 12 }} message={t("permission.hint")} />
      {PERMISSION_GROUPS.map((g) => {
        const s = groupState(g.keys);
        return (
          <div key={g.key} style={{ marginBottom: 16 }}>
            <Checkbox
              checked={s.all}
              indeterminate={s.some}
              onChange={(e) => toggle(e.target.checked, ...g.keys)}
            >
              <Typography.Text strong>{t(`permission.group.${g.key}` as never)}</Typography.Text>
            </Checkbox>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "4px 12px",
                padding: "6px 0 0 24px",
              }}
            >
              {g.keys.map((k) => (
                <Checkbox key={k} checked={checked.has(k)} onChange={(e) => toggle(e.target.checked, k)}>
                  {t(permissionLabelKey(k) as never)}
                </Checkbox>
              ))}
            </div>
          </div>
        );
      })}
      <Checkbox
        checked={settingAll.all}
        indeterminate={settingAll.some}
        onChange={(e) => toggle(e.target.checked, ...settingKeys)}
      >
        <Typography.Text strong>{t("permission.group.setting")}</Typography.Text>
      </Checkbox>
      <Table
        size="small"
        style={{ marginTop: 6, paddingLeft: 24 }}
        rowKey="category"
        pagination={false}
        dataSource={SETTING_PERMISSION_ROWS}
        columns={[
          {
            title: t("permission.setting_category"),
            dataIndex: "category",
            render: (c: string) => t(`permission.setting.${c}` as never),
          },
          {
            title: t("permission.view"),
            width: 80,
            align: "center",
            render: (_, r) =>
              r.view ? (
                <Checkbox
                  checked={checked.has(r.view)}
                  onChange={(e) =>
                    e.target.checked ? toggle(true, r.view!) : toggle(false, r.view!, ...(r.edit ? [r.edit] : []))
                  }
                />
              ) : (
                "—"
              ),
          },
          {
            title: t("permission.edit"),
            width: 80,
            align: "center",
            render: (_, r) =>
              r.edit ? (
                <Checkbox
                  checked={checked.has(r.edit)}
                  onChange={(e) =>
                    e.target.checked ? toggle(true, r.edit!, ...(r.view ? [r.view] : [])) : toggle(false, r.edit!)
                  }
                />
              ) : (
                "—"
              ),
          },
        ]}
      />
    </Modal>
  );
};

export default PermissionModal;
