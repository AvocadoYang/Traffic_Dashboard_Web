import { FC, useEffect, useState } from "react";
import { InputNumber, Switch, message } from "antd";
import { SaveOutlined, SwapOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
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

type ChargeQueueSetting = {
  queueEnabled: boolean;
  swapEnabled: boolean;
  swapWaitSec: number;
};

type ChargeQueueRuntime = {
  waiting: { amrId: string; battery: number; waitingSec: number; holdsWork: boolean }[];
  reservations: { stationId: string; forAmrId: string; fromAmrId: string; remainSec: number }[];
  swaps: {
    at: number;
    forAmrId: string;
    fromAmrId: string;
    stationId: string;
    ok: boolean;
    reason?: string;
  }[];
};

type ChargeQueueResponse = { setting: ChargeQueueSetting; runtime: ChargeQueueRuntime };

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/**
 * 每台車充電管理最上面: 充電站全滿時要不要排隊 / 換手 (整個案場一組), 和現在誰在等。
 * 換手要先開排隊; 誰算缺電、誰可以讓位看下面每一列自己的主動充電 / 可接任務門檻。
 */
const ChargeQueueSection: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form, setForm] = useState<ChargeQueueSetting | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["charge-queue"],
    queryFn: async () => {
      const res = await client.get<ChargeQueueResponse>("api/setting/charge-queue");
      return res.data;
    },
    // 看排隊的狀況用, 5 秒更新一次就夠
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data && form === null) setForm(data.setting);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (body: ChargeQueueSetting) => client.post("api/setting/charge-queue", body),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  if (!form || !data) return null;

  const changed = JSON.stringify(form) !== JSON.stringify(data.setting);
  const runtime = data.runtime;

  return (
    <Section data-testid="charge-queue-section">
      {contextHolder}
      <SectionTitle>
        <SwapOutlined />
        {t("charge_queue.title")}
      </SectionTitle>

      <FieldGrid>
        <Field>
          <FieldLabel>{t("charge_queue.queue")}</FieldLabel>
          <Switch
            style={{ alignSelf: "flex-start" }}
            checked={form.queueEnabled}
            onChange={(v) =>
              setForm({ ...form, queueEnabled: v, swapEnabled: v ? form.swapEnabled : false })
            }
          />
        </Field>
        <Field>
          <FieldLabel>{t("charge_queue.swap")}</FieldLabel>
          <Switch
            style={{ alignSelf: "flex-start" }}
            checked={form.swapEnabled}
            disabled={!form.queueEnabled}
            onChange={(v) => setForm({ ...form, swapEnabled: v })}
          />
        </Field>
        <Field>
          <FieldLabel>{t("charge_queue.swap_wait")}</FieldLabel>
          <InputNumber
            style={{ alignSelf: "flex-start" }}
            min={0}
            max={3600}
            precision={0}
            addonAfter={t("charge_queue.sec")}
            value={form.swapWaitSec}
            disabled={!form.swapEnabled}
            onChange={(v) => setForm({ ...form, swapWaitSec: Number(v ?? 0) })}
          />
        </Field>
      </FieldGrid>

      <Toolbar>
        <SolidButton
          onClick={() => saveMutation.mutate(form)}
          disabled={!changed || saveMutation.isLoading}
        >
          <SaveOutlined />
          {t("utils.save")}
        </SolidButton>
      </Toolbar>

      <Hint>{t("charge_queue.queue_hint")}</Hint>
      <Hint>{t("charge_queue.swap_hint")}</Hint>

      {data.setting.queueEnabled && (
        <>
          <FieldLabel>{t("charge_queue.waiting_title")}</FieldLabel>
          {runtime.waiting.length === 0 ? (
            <Hint>{t("charge_queue.nobody_waiting")}</Hint>
          ) : (
            <Toolbar>
              {runtime.waiting.map((w) => (
                <Tag key={w.amrId}>
                  {t("charge_queue.waiting_item", {
                    amrId: w.amrId,
                    battery: w.battery,
                    time: mmss(w.waitingSec),
                  })}
                  {w.holdsWork ? ` · ${t("charge_queue.holds_work")}` : ""}
                </Tag>
              ))}
            </Toolbar>
          )}
          {runtime.reservations.map((r) => (
            <Hint key={r.stationId}>
              {t("charge_queue.reservation_item", {
                stationId: r.stationId,
                forAmrId: r.forAmrId,
                fromAmrId: r.fromAmrId,
                time: mmss(Math.max(0, r.remainSec)),
              })}
            </Hint>
          ))}
          {runtime.swaps.slice(0, 5).map((s) => (
            <Hint key={`${s.at}-${s.fromAmrId}`}>
              {new Date(s.at).toLocaleTimeString()}{" "}
              {s.ok
                ? t("charge_queue.swap_ok", {
                    fromAmrId: s.fromAmrId,
                    stationId: s.stationId,
                    forAmrId: s.forAmrId,
                  })
                : t("charge_queue.swap_failed", {
                    fromAmrId: s.fromAmrId,
                    forAmrId: s.forAmrId,
                    reason: s.reason ?? "",
                  })}
            </Hint>
          ))}
        </>
      )}
    </Section>
  );
};

export default ChargeQueueSection;
