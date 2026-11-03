import { FC, useEffect, useState } from "react";
import { InputNumber, Skeleton, Switch, message } from "antd";
import { HeartOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler } from "@/utils/utils";
import StatusTag from "../../ui/StatusTag";
import {
  Section,
  SectionTitle,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  Hint,
  Tag,
} from "../../ui/primitives";

type Level = "ok" | "warning" | "alarm";

type Rule = {
  enabled: boolean;
  warnAt: number;
  alarmAt: number;
  sustainSec: number;
  reportEcs: boolean;
};

type Row = {
  metric: string;
  label: string;
  unit: string;
  hint: string;
  value: number | null;
  detail: string;
  level: Level;
  since: number | null;
};

type HealthResponse = {
  host: string;
  rev: string;
  rules: Record<string, Rule>;
  rows: Row[];
};

const QUERY_KEY = ["health-status"];

/**
 * 主機 / 程式健康檢查: 磁碟、記憶體、後端卡頓、資料庫、Redis。
 * 超標會在系統告警跳出來; 勾了「回報給 Corning」的項目另外送 ECS
 * (嚴重 → AL, 輕微 → WN)。每台主機各量各的, 這裡顯示的是正在回應的這一台。
 */
const HealthMonitorSection: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form, setForm] = useState<Record<string, Rule> | null>(null);

  const { data, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await client.get<HealthResponse>("api/setting/health-status");
      return res.data;
    },
    // 現在的讀數會變; 表單只在第一次載入時填入, 不會被這個覆蓋
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (data && form === null) setForm(data.rules);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (rules: Record<string, Rule>) =>
      client.post<HealthResponse>("api/setting/health-rules", {
        rules,
        rev: data?.rev,
      }),
    onSuccess: (res) => {
      void messageApi.success(t("utils.success"));
      setForm(res.data.rules);
      void refetch();
    },
    onError: (e: ErrorResponse) =>
      editErrorHandler(e, messageApi, () => {
        void refetch().then((r) => r.data && setForm(r.data.rules));
      }),
  });

  if (!form || !data) return <Skeleton active />;

  const changed = JSON.stringify(form) !== JSON.stringify(data.rules);
  const patch = (metric: string, part: Partial<Rule>) =>
    setForm({ ...form, [metric]: { ...form[metric], ...part } });

  const levelTag = (level: Level) =>
    level === "alarm" ? (
      <StatusTag $on>{t("health_monitor.level.alarm")}</StatusTag>
    ) : level === "warning" ? (
      <Tag>{t("health_monitor.level.warning")}</Tag>
    ) : (
      <StatusTag $on={false}>{t("health_monitor.level.ok")}</StatusTag>
    );

  return (
    <Section data-testid="health-monitor-section">
      {contextHolder}
      <SectionTitle>
        <HeartOutlined />
        {t("health_monitor.title")}
      </SectionTitle>

      <Hint>{t("health_monitor.hint", { host: data.host })}</Hint>

      <CardList>
        {data.rows.map((row) => {
          const rule = form[row.metric];
          if (!rule) return null;
          return (
            <ItemCard key={row.metric} data-testid={`health-card-${row.metric}`}>
              <CardTitleRow>
                <span>{row.label}</span>
                {levelTag(row.level)}
              </CardTitleRow>

              <CardFacts>
                <dt>{t("health_monitor.current")}</dt>
                <dd>
                  {row.value === null
                    ? t("health_monitor.not_measured")
                    : row.detail || `${row.value} ${row.unit}`}
                </dd>
                {row.since && (
                  <>
                    <dt>{t("health_monitor.since")}</dt>
                    <dd>{new Date(row.since).toLocaleString()}</dd>
                  </>
                )}
              </CardFacts>

              <Hint>{row.hint}</Hint>

              <FieldGrid $cols={3}>
                <Field>
                  <FieldLabel>{t("health_monitor.warn_at")}</FieldLabel>
                  <InputNumber
                    style={{ alignSelf: "flex-start" }}
                    min={1}
                    precision={0}
                    addonAfter={row.unit}
                    value={rule.warnAt}
                    onChange={(v) => patch(row.metric, { warnAt: Number(v ?? 1) })}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("health_monitor.alarm_at")}</FieldLabel>
                  <InputNumber
                    style={{ alignSelf: "flex-start" }}
                    min={1}
                    precision={0}
                    addonAfter={row.unit}
                    value={rule.alarmAt}
                    onChange={(v) => patch(row.metric, { alarmAt: Number(v ?? 1) })}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("health_monitor.sustain")}</FieldLabel>
                  <InputNumber
                    style={{ alignSelf: "flex-start" }}
                    min={0}
                    max={3600}
                    precision={0}
                    addonAfter={t("health_monitor.sustain_unit")}
                    value={rule.sustainSec}
                    onChange={(v) => patch(row.metric, { sustainSec: Number(v ?? 0) })}
                  />
                </Field>
              </FieldGrid>

              <Toolbar>
                <Switch
                  size="small"
                  checked={rule.enabled}
                  onChange={(enabled) => patch(row.metric, { enabled })}
                />
                <span>{t("health_monitor.enable")}</span>
                <Switch
                  size="small"
                  checked={rule.reportEcs}
                  disabled={!rule.enabled}
                  onChange={(reportEcs) => patch(row.metric, { reportEcs })}
                />
                <span>{t("health_monitor.report_ecs")}</span>
              </Toolbar>
            </ItemCard>
          );
        })}
      </CardList>

      <Hint>{t("health_monitor.report_ecs_hint")}</Hint>

      <Toolbar>
        <SolidButton
          onClick={() => saveMutation.mutate(form)}
          disabled={!changed || saveMutation.isLoading}
        >
          <SaveOutlined />
          {t("utils.save")}
        </SolidButton>
      </Toolbar>
    </Section>
  );
};

export default HealthMonitorSection;
