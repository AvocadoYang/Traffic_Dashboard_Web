import { FC, useEffect, useMemo, useState } from "react";
import { Button, Input, InputNumber, Select, Switch, Table, TimePicker, message } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler } from "@/utils/utils";
import { TIME_FORMAT, toDayjs, toHhmm, weekdayOptions } from "@/pages/SettingV3/ui/timeCondition";
import {
  Field,
  FieldGrid,
  FieldLabel,
  Hint,
  PanelShell,
  Section,
  SectionTitle,
  SolidButton,
  Toolbar,
} from "@/pages/SettingV3/ui/primitives";

type Mode = "AUTO" | "AUTO_PLUS" | "FIXED";
type DefaultMode = "AUTO" | "NONE";

type DemandRule = {
  /** 存過的才有; 新加的在送出前沒有 */
  id?: string;
  /** 畫面用的 key */
  key: string;
  enabled: boolean;
  /** null = 全部待命點 */
  locationId: string | null;
  activeDays: number[];
  timeFrom: string | null;
  timeTo: string | null;
  mode: Mode;
  value: number;
  note: string;
};

type RulesResponse = {
  rules: Omit<DemandRule, "key">[];
  defaultMode: DefaultMode;
  rev: string;
  points: { locationId: string }[];
};

type PreviewPoint = {
  locationId: string;
  value: number;
  history: number;
  source: "AUTO" | "AUTO_PLUS" | "FIXED" | "DEFAULT_AUTO" | "DEFAULT_NONE";
  ruleId: string | null;
  carHere: string | null;
};

const ALL = "__all__";
let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const rate = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

/**
 * 設定 > 調度規則 > 預先停靠: 閒置規則「回待命點」選「依需求預先停靠」時, 每個待命點的需求怎麼算。
 * 規則由上往下比對, 第一條符合的決定 (自動分析 / 自動分析再加 N / 固定 N); 都不符合看最下面的預設。
 * 下面的預覽照目前的規則算某個時段每個待命點的需求。
 */
const StandbyDemandPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [rules, setRules] = useState<DemandRule[]>([]);
  const [defaultMode, setDefaultMode] = useState<DefaultMode>("AUTO");
  const [dirty, setDirty] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["idle-rules-demand"],
    queryFn: async () => (await client.get<RulesResponse>("api/setting/idle-rules-demand")).data,
  });

  useEffect(() => {
    if (!data || dirty) return;
    setRules(data.rules.map((r) => ({ ...r, key: r.id ?? newKey() })));
    setDefaultMode(data.defaultMode);
  }, [data, dirty]);

  // 預覽: 參考天數 + 哪個時段 (預設現在)
  const now = new Date();
  const [days, setDays] = useState(14);
  const [weekday, setWeekday] = useState(now.getDay() === 0 ? 7 : now.getDay());
  const [hour, setHour] = useState(now.getHours());
  const preview = useQuery({
    queryKey: ["idle-rules-demand-preview", days, weekday, hour, data?.rev],
    queryFn: async () =>
      (
        await client.get<{ at: number; points: PreviewPoint[] }>("api/setting/idle-rules-demand-preview", {
          params: { days, weekday, hour },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: () =>
      client.post("api/setting/idle-rules-demand", {
        rules: rules.map(({ key: _key, ...r }) => r),
        defaultMode,
        rev: data?.rev,
      }),
    onSuccess: () => {
      messageApi.success(t("standby_demand.saved"));
      setDirty(false);
      void refetch();
      void preview.refetch();
    },
    onError: (e: ErrorResponse) => editErrorHandler(e, messageApi, () => {
      setDirty(false);
      void refetch();
    }),
  });

  const change = (key: string, patch: Partial<DemandRule>) => {
    setRules((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const move = (index: number, step: -1 | 1) => {
    const to = index + step;
    if (to < 0 || to >= rules.length) return;
    const next = [...rules];
    [next[index], next[to]] = [next[to], next[index]];
    setRules(next);
    setDirty(true);
  };
  const add = () => {
    setRules((list) => [
      ...list,
      { key: newKey(), enabled: true, locationId: null, activeDays: [], timeFrom: null, timeTo: null, mode: "AUTO_PLUS", value: 1, note: "" },
    ]);
    setDirty(true);
  };

  const pointOptions = useMemo(
    () => [
      { value: ALL, label: t("standby_demand.all_points") },
      ...(data?.points ?? []).map((p) => ({ value: p.locationId, label: p.locationId })),
    ],
    [data?.points, t],
  );
  const modeOptions = (["AUTO", "AUTO_PLUS", "FIXED"] as const).map((m) => ({
    value: m,
    label: t(`standby_demand.mode.${m}`),
  }));

  const ruleIndex = new Map(rules.map((r, i) => [r.id ?? r.key, i + 1]));

  const columns: TableColumnsType<DemandRule> = [
    {
      title: "#",
      width: 40,
      render: (_: unknown, __: DemandRule, i: number) => i + 1,
    },
    {
      title: t("standby_demand.col.enabled"),
      render: (_: unknown, r) => <Switch size="small" checked={r.enabled} onChange={(v) => change(r.key, { enabled: v })} />,
    },
    {
      title: t("standby_demand.col.point"),
      render: (_: unknown, r) => (
        <Select
          style={{ width: 130 }}
          value={r.locationId ?? ALL}
          options={pointOptions}
          showSearch
          onChange={(v) => change(r.key, { locationId: v === ALL ? null : v })}
        />
      ),
    },
    {
      title: t("standby_demand.col.days"),
      render: (_: unknown, r) => (
        <Select
          mode="multiple"
          style={{ minWidth: 160 }}
          value={r.activeDays}
          options={weekdayOptions(t)}
          placeholder={t("standby_demand.every_day")}
          onChange={(v) => change(r.key, { activeDays: v })}
        />
      ),
    },
    {
      title: t("standby_demand.col.time"),
      render: (_: unknown, r) => (
        <TimePicker.RangePicker
          format={TIME_FORMAT}
          allowEmpty={[true, true]}
          placeholder={[t("standby_demand.whole_day"), ""]}
          value={[toDayjs(r.timeFrom), toDayjs(r.timeTo)]}
          onChange={(v) => change(r.key, { timeFrom: toHhmm(v?.[0] ?? null), timeTo: toHhmm(v?.[1] ?? null) })}
        />
      ),
    },
    {
      title: t("standby_demand.col.mode"),
      render: (_: unknown, r) => (
        <Select style={{ width: 150 }} value={r.mode} options={modeOptions} onChange={(v) => change(r.key, { mode: v })} />
      ),
    },
    {
      title: t("standby_demand.col.value"),
      render: (_: unknown, r) =>
        r.mode === "AUTO" ? (
          "-"
        ) : (
          <InputNumber
            style={{ width: 110 }}
            value={r.value}
            min={r.mode === "FIXED" ? 0 : -1000}
            max={1000}
            step={0.5}
            suffix={t("standby_demand.per_hour")}
            onChange={(v) => change(r.key, { value: Number(v ?? 0) })}
          />
        ),
    },
    {
      title: t("standby_demand.col.note"),
      render: (_: unknown, r) => (
        <Input style={{ width: 140 }} maxLength={100} value={r.note} onChange={(e) => change(r.key, { note: e.target.value })} />
      ),
    },
    {
      title: "",
      render: (_: unknown, r, i) => (
        <>
          <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, -1)} />
          <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={i === rules.length - 1} onClick={() => move(i, 1)} />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setRules((list) => list.filter((x) => x.key !== r.key));
              setDirty(true);
            }}
          />
        </>
      ),
    },
  ];

  const sourceText = (p: PreviewPoint) =>
    p.source === "DEFAULT_AUTO"
      ? t("standby_demand.source.default_auto")
      : p.source === "DEFAULT_NONE"
        ? t("standby_demand.source.default_none")
        : t("standby_demand.source.rule", {
            n: ruleIndex.get(p.ruleId ?? "") ?? "?",
            mode: t(`standby_demand.mode.${p.source as Mode}`),
          });

  const previewColumns: TableColumnsType<PreviewPoint> = [
    { title: t("standby_demand.col.point"), dataIndex: "locationId" },
    { title: t("standby_demand.col.history"), dataIndex: "history", align: "right", render: rate },
    { title: t("standby_demand.col.applied"), render: (_: unknown, p) => sourceText(p) },
    {
      title: t("standby_demand.col.demand"),
      dataIndex: "value",
      align: "right",
      render: (v: number) => <b>{rate(v)}</b>,
      defaultSortOrder: "descend",
      sorter: (a, b) => a.value - b.value,
    },
    { title: t("standby_demand.col.car_here"), dataIndex: "carHere", render: (v: string | null) => v ?? "-" },
  ];

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>{t("standby_demand.title")}</SectionTitle>
        <Hint>{t("standby_demand.hint")}</Hint>

        <Table
          size="small"
          rowKey="key"
          pagination={false}
          dataSource={rules}
          columns={columns}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: t("standby_demand.no_rules") }}
        />
        <Toolbar>
          <Button icon={<PlusOutlined />} onClick={add}>
            {t("standby_demand.add")}
          </Button>
        </Toolbar>

        <Toolbar>
          <span>{t("standby_demand.default_label")}</span>
          <Select
            style={{ width: 200 }}
            value={defaultMode}
            options={[
              { value: "AUTO", label: t("standby_demand.default_auto") },
              { value: "NONE", label: t("standby_demand.default_none") },
            ]}
            onChange={(v) => {
              setDefaultMode(v);
              setDirty(true);
            }}
          />
          <SolidButton onClick={() => save.mutate()} disabled={!dirty || save.isLoading}>
            {t("standby_demand.save")}
          </SolidButton>
          {dirty && <Hint style={{ margin: 0 }}>{t("standby_demand.unsaved")}</Hint>}
        </Toolbar>
      </Section>

      <Section>
        <SectionTitle>{t("standby_demand.preview")}</SectionTitle>
        <Hint>{t("standby_demand.preview_hint")}</Hint>
        <FieldGrid $cols={3}>
          <Field>
            <FieldLabel>{t("standby_demand.days_label")}</FieldLabel>
            <InputNumber min={1} max={90} precision={0} value={days} onChange={(v) => setDays(Number(v ?? 14))} />
          </Field>
          <Field>
            <FieldLabel>{t("standby_demand.weekday_label")}</FieldLabel>
            <Select value={weekday} options={weekdayOptions(t)} onChange={setWeekday} />
          </Field>
          <Field>
            <FieldLabel>{t("standby_demand.hour_label")}</FieldLabel>
            <Select
              value={hour}
              options={Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00` }))}
              onChange={setHour}
            />
          </Field>
        </FieldGrid>
        <Table
          size="small"
          rowKey="locationId"
          loading={preview.isFetching}
          pagination={false}
          dataSource={preview.data?.points ?? []}
          columns={previewColumns}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: t("standby_demand.no_points") }}
        />
      </Section>
    </PanelShell>
  );
};

export default StandbyDemandPanel;
