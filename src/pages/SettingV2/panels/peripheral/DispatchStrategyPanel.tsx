import { FC, useEffect, useState } from "react";
import { InputNumber, Radio, Skeleton, message } from "antd";
import { ApartmentOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler } from "@/utils/utils";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  Hint,
  Tag,
} from "../../ui/primitives";

type DispatchStrategySetting = {
  mode: "fifo" | "batch";
  agingSecPerMin: number;
  maxWaitMin: number;
};

type DispatchStrategyResponse = {
  setting: DispatchStrategySetting;
  rev: string;
  runtime: {
    lastRound: {
      at: string;
      cars: number;
      missions: number;
      assigned: number;
      failed: number;
    } | null;
  };
};

const QUERY_KEY = ["dispatch-strategy"];

/**
 * 派車策略 (整個案場一組): 先來先派 (原本的做法) 或全域配對。
 * 等待權重、最久等待只有全域配對會用到。
 */
const DispatchStrategyPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form, setForm] = useState<DispatchStrategySetting | null>(null);

  const { data, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await client.get<DispatchStrategyResponse>("api/setting/dispatch-strategy");
      return res.data;
    },
    // 看上一輪配對的結果用
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data && form === null) setForm(data.setting);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (body: DispatchStrategySetting) =>
      client.post<DispatchStrategyResponse>("api/setting/dispatch-strategy", {
        ...body,
        rev: data?.rev,
      }),
    onSuccess: (res) => {
      void messageApi.success(t("utils.success"));
      setForm(res.data.setting);
      void refetch();
    },
    onError: (e: ErrorResponse) =>
      editErrorHandler(e, messageApi, () => {
        void refetch().then((r) => r.data && setForm(r.data.setting));
      }),
  });

  if (!form || !data) return <Skeleton active />;

  const changed = JSON.stringify(form) !== JSON.stringify(data.setting);
  const batch = form.mode === "batch";
  const lastRound = data.runtime.lastRound;

  return (
    <PanelShell data-testid="dispatch-strategy-panel">
      {contextHolder}
      <Section>
        <SectionTitle>
          <ApartmentOutlined />
          {t("dispatch_strategy.title")}
        </SectionTitle>

        <Field as="div">
          <FieldLabel>{t("dispatch_strategy.mode")}</FieldLabel>
          <Radio.Group
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <Radio value="fifo">
              {t("dispatch_strategy.fifo")}
              <Hint style={{ margin: 0 }}>{t("dispatch_strategy.fifo_hint")}</Hint>
            </Radio>
            <Radio value="batch">
              {t("dispatch_strategy.batch")}
              <Hint style={{ margin: 0 }}>{t("dispatch_strategy.batch_hint")}</Hint>
            </Radio>
          </Radio.Group>
        </Field>

        <FieldGrid>
          <Field>
            <FieldLabel>{t("dispatch_strategy.aging")}</FieldLabel>
            <InputNumber
              style={{ alignSelf: "flex-start" }}
              min={0}
              max={600}
              precision={0}
              addonAfter={t("dispatch_strategy.aging_unit")}
              value={form.agingSecPerMin}
              disabled={!batch}
              onChange={(v) => setForm({ ...form, agingSecPerMin: Number(v ?? 0) })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("dispatch_strategy.max_wait")}</FieldLabel>
            <InputNumber
              style={{ alignSelf: "flex-start" }}
              min={0}
              max={1440}
              precision={0}
              addonAfter={t("dispatch_strategy.max_wait_unit")}
              value={form.maxWaitMin}
              disabled={!batch}
              onChange={(v) => setForm({ ...form, maxWaitMin: Number(v ?? 0) })}
            />
          </Field>
        </FieldGrid>
        <Hint>{t("dispatch_strategy.aging_hint")}</Hint>
        <Hint>{t("dispatch_strategy.max_wait_hint")}</Hint>

        <Toolbar>
          <SolidButton
            onClick={() => saveMutation.mutate(form)}
            disabled={!changed || saveMutation.isLoading}
          >
            <SaveOutlined />
            {t("utils.save")}
          </SolidButton>
        </Toolbar>

        <Hint>{t("dispatch_strategy.common_hint")}</Hint>

        {data.setting.mode === "batch" && (
          <Toolbar>
            <Tag data-testid="dispatch-strategy-last-round">
              {lastRound
                ? t("dispatch_strategy.last_round", {
                    time: new Date(lastRound.at).toLocaleTimeString(),
                    cars: lastRound.cars,
                    missions: lastRound.missions,
                    assigned: lastRound.assigned,
                    failed: lastRound.failed,
                  })
                : t("dispatch_strategy.last_round_none")}
            </Tag>
          </Toolbar>
        )}
      </Section>
    </PanelShell>
  );
};

export default DispatchStrategyPanel;
