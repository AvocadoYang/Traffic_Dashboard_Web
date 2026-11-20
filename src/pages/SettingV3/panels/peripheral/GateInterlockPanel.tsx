import { FC } from "react";
import { Modal, Skeleton, Switch, message } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler } from "@/utils/utils";
import {
  PanelShell,
  Section,
  SectionTitle,
  Field,
  FieldLabel,
  Hint,
  Tag,
  WarnNote,
} from "../../ui/primitives";

type GateInterlockResponse = {
  setting: { enabled: boolean };
  rev: string;
};

const QUERY_KEY = ["gate-interlock"];
const RISK_KEYS = ["risk_1", "risk_2", "risk_3", "risk_4", "risk_5"] as const;

/**
 * 康寧 502 捲門 interlock (整個案場一組): 車到捲門 / 等待點前要不要先暫停。
 * 關閉時要先確認過風險才會存。
 */
const GateInterlockPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await client.get<GateInterlockResponse>("api/setting/gate-interlock");
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      client.post<GateInterlockResponse>("api/setting/gate-interlock", {
        enabled,
        rev: data?.rev,
      }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => editErrorHandler(e, messageApi, () => void refetch()),
  });

  if (!data) return <Skeleton active />;

  const enabled = data.setting.enabled;

  const onToggle = (next: boolean) => {
    if (next) {
      saveMutation.mutate(true);
      return;
    }
    Modal.confirm({
      title: t("gate_interlock.risk_confirm"),
      content: t("gate_interlock.risk_confirm_desc"),
      okType: "danger",
      okText: t("gate_interlock.off"),
      cancelText: t("utils.cancel"),
      onOk: () => saveMutation.mutateAsync(false),
    });
  };

  return (
    <PanelShell data-testid="gate-interlock-panel">
      {contextHolder}
      <Section>
        <SectionTitle>
          <SafetyCertificateOutlined />
          {t("gate_interlock.title")}
        </SectionTitle>

        <Field as="div">
          <FieldLabel>{t("gate_interlock.switch")}</FieldLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              data-testid="gate-interlock-switch"
              checked={enabled}
              loading={saveMutation.isLoading}
              onChange={onToggle}
            />
            <Tag>{enabled ? t("gate_interlock.on") : t("gate_interlock.off")}</Tag>
          </div>
        </Field>
        <Hint>{t("gate_interlock.desc")}</Hint>

        <WarnNote data-testid="gate-interlock-risk">
          <strong>{t("gate_interlock.risk_title")}</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {RISK_KEYS.map((k) => (
              <li key={k}>{t(`gate_interlock.${k}`)}</li>
            ))}
          </ul>
        </WarnNote>

        <Hint>{t("gate_interlock.note")}</Hint>
      </Section>
    </PanelShell>
  );
};

export default GateInterlockPanel;
