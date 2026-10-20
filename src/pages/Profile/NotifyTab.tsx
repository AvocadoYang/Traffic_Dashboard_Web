import { FC, useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Slider, Switch, Table, Tag, message } from "antd";
import type { TableColumnsType } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { AlarmType, NotifyPrefs, useMyProfile, useSaveProfile } from "@/api/useProfile";
import { io } from "@/sockets/socketConnect";
import { DEFAULT_SOUND, DEFAULT_VOLUME, playAlarmTone } from "@/utils/alarmSound";
import { Section, SettingRow } from "./parts";

export const ALARM_TYPES: AlarmType[] = ["error", "warn", "success", "info"];
const DEDUPE_OPTIONS = [0, 10, 30, 60, 300, 600];

type SiteAlarmConfig = Record<string, { enable: boolean; description?: string }>;
type CodeRow = { code: number; description: string; siteEnabled: boolean; muted: boolean };

/**
 * 通知: 哪些告警要跳出來 / 要響、音量、同一則多久內不再跳、個別告警代碼不要對我跳。
 * 全案場關掉的告警 (設定頁的系統告警) 誰都看不到, 這裡只能再關掉更多。
 */
const NotifyTab: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: profile } = useMyProfile();
  const save = useSaveProfile();
  const notify: NotifyPrefs = profile?.preferences.notify ?? {};
  const volume = notify.volume ?? DEFAULT_VOLUME;
  const [siteConfig, setSiteConfig] = useState<SiteAlarmConfig>({});
  const [search, setSearch] = useState("");

  // 告警代碼清單是後端推過來的 (跟設定頁的系統告警同一份)
  useEffect(() => {
    const handle = (data: SiteAlarmConfig) => setSiteConfig(data ?? {});
    io.on("system-alarm-config", handle);
    return () => {
      io.off("system-alarm-config", handle);
    };
  }, []);

  const saveNotify = (patch: NotifyPrefs) =>
    save.mutate(
      { preferences: { notify: patch } },
      { onError: () => void messageApi.error(t("profile.save_failed")) },
    );

  const muted = useMemo(() => new Set(notify.mutedCodes ?? []), [notify.mutedCodes]);

  const rows: CodeRow[] = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return Object.entries(siteConfig)
      .map(([code, v]) => ({
        code: Number(code),
        description: v.description ?? "",
        siteEnabled: v.enable !== false,
        muted: muted.has(Number(code)),
      }))
      .filter((r) => Number.isInteger(r.code))
      .filter((r) => !keyword || String(r.code).includes(keyword) || r.description.toLowerCase().includes(keyword))
      .sort((a, b) => a.code - b.code);
  }, [siteConfig, muted, search]);

  const toggleCode = (code: number, show: boolean) => {
    const next = new Set(muted);
    if (show) next.delete(code);
    else next.add(code);
    saveNotify({ mutedCodes: [...next] });
  };

  const typeColumns: TableColumnsType<{ type: AlarmType }> = [
    {
      title: t("profile.notify.type"),
      dataIndex: "type",
      render: (type: AlarmType) => t(`profile.notify.types.${type}` as never),
    },
    {
      title: t("profile.notify.popup"),
      width: 110,
      render: (_, { type }) => (
        <Switch
          size="small"
          checked={notify.types?.[type] !== false}
          onChange={(checked) => saveNotify({ types: { ...notify.types, [type]: checked } })}
        />
      ),
    },
    {
      title: t("profile.notify.sound"),
      width: 160,
      render: (_, { type }) => (
        <>
          <Switch
            size="small"
            checked={notify.sound?.[type] ?? DEFAULT_SOUND[type]}
            onChange={(checked) =>
              saveNotify({ sound: { ...DEFAULT_SOUND, ...notify.sound, [type]: checked } })
            }
          />
          <Button
            type="text"
            size="small"
            icon={<SoundOutlined />}
            aria-label={t("profile.notify.try_sound")}
            title={t("profile.notify.try_sound")}
            onClick={() => playAlarmTone(type, volume || DEFAULT_VOLUME)}
          />
        </>
      ),
    },
  ];

  const codeColumns: TableColumnsType<CodeRow> = [
    { title: t("system_alarm.alarm_code"), dataIndex: "code", width: 110 },
    {
      title: t("system_alarm.description"),
      dataIndex: "description",
      render: (v: string, r) => (
        <>
          {v || "—"}{" "}
          {!r.siteEnabled && <Tag>{t("profile.notify.site_disabled")}</Tag>}
        </>
      ),
    },
    {
      title: t("profile.notify.show_to_me"),
      width: 120,
      render: (_, r) => (
        <Switch
          size="small"
          disabled={!r.siteEnabled}
          checked={r.siteEnabled && !r.muted}
          onChange={(checked) => toggleCode(r.code, checked)}
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Section title={t("profile.notify.by_type")} hint={t("profile.notify.by_type_hint")}>
        <Table
          size="small"
          rowKey="type"
          pagination={false}
          dataSource={ALARM_TYPES.map((type) => ({ type }))}
          columns={typeColumns}
        />
        <SettingRow label={t("profile.notify.volume")}>
          <Slider
            style={{ maxWidth: 320 }}
            min={0}
            max={100}
            step={5}
            value={volume}
            onChangeComplete={(v: number) => {
              saveNotify({ volume: v });
              playAlarmTone("warn", v);
            }}
          />
        </SettingRow>
        <SettingRow label={t("profile.notify.dedupe")} help={t("profile.notify.dedupe_help")}>
          <Select
            style={{ width: 200 }}
            value={notify.dedupeSeconds ?? 0}
            onChange={(dedupeSeconds) => saveNotify({ dedupeSeconds })}
            options={DEDUPE_OPTIONS.map((s) => ({
              value: s,
              label: s === 0 ? t("profile.notify.dedupe_off") : s < 60 ? t("profile.notify.seconds", { count: s }) : t("profile.prefs.idle_minutes", { count: s / 60 }),
            }))}
          />
        </SettingRow>
      </Section>

      <Section
        title={t("profile.notify.by_code")}
        hint={t("profile.notify.by_code_hint")}
        extra={
          <Input.Search
            allowClear
            style={{ width: 240 }}
            placeholder={t("utils.search")}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <Table
          size="small"
          rowKey="code"
          dataSource={rows}
          columns={codeColumns}
          pagination={{ pageSize: 10, size: "small" }}
          scroll={{ x: "max-content" }}
        />
      </Section>
    </>
  );
};

export default NotifyTab;
