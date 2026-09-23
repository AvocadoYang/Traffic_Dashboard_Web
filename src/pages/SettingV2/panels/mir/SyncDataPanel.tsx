import { FC, useMemo, useState } from "react";
import { Select, message } from "antd";
import {
  AimOutlined,
  ApartmentOutlined,
  BorderOutlined,
  CloudSyncOutlined,
  EnvironmentOutlined,
  SendOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { c, font, space } from "../../ui/tokens";
import {
  PanelShell,
  Section,
  SectionTitle,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  CardFacts,
  Hint,
} from "../../ui/primitives";

/** 不指定車輛時送這個值,後端會自己挑一台 */
const RANDOM_VALUE = "null";

const SYNC_TYPES = [
  { value: "mission", label: "Mission", icon: <ApartmentOutlined /> },
  { value: "footprint", label: "Footprint", icon: <BorderOutlined /> },
  { value: "marker_type", label: "Marker Type", icon: <AimOutlined /> },
  { value: "location", label: "Location", icon: <EnvironmentOutlined /> },
  {
    value: "retrieve_mission",
    label: "Retrieve Mission",
    icon: <ApartmentOutlined />,
  },
  {
    value: "retrieve_location",
    label: "Retrieve Location",
    icon: <EnvironmentOutlined />,
  },
];

/** 「取回」是反方向(從車上讀回伺服器),各自有專用 API;沒列到的都走推送那支 */
const SYNC_TYPE_URL: Record<string, string> = {
  retrieve_mission: "sync-mir-mission",
  retrieve_location: "sync-mir-locations",
};

const DEFAULT_SYNC_URL = "mir-sync-data";

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${space.sm};
`;

const TypeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.md};
  cursor: pointer;
  font-family: ${font.mono};
  font-size: ${font.xs};
  letter-spacing: 0.8px;
  text-transform: uppercase;
  text-align: left;
  transition: all 0.15s ease;

  border: 1px solid ${({ $active }) => ($active ? c.accent : c.border)};
  background: ${({ $active }) => ($active ? c.accent : c.bg)};
  color: ${({ $active }) => ($active ? c.onAccent : c.textSecondary)};

  &:hover {
    border-color: ${({ $active }) => ($active ? c.accent : c.borderStrong)};
    color: ${({ $active }) => ($active ? c.onAccent : c.text)};
  }
`;

const SyncDataPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const { data: name } = useName();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const [amrId, setAmrId] = useState<string | undefined>();
  const [syncType, setSyncType] = useState<string | undefined>();

  // 模擬模式只列模擬車,實機模式只列實體車
  const amrOptions = useMemo(() => {
    if (!name) return undefined;
    const options = name.amrs
      .filter((a) => (name.isSim ? a.isReal === false : a.isReal === true))
      .map((m) => ({ label: m.amrId, value: m.amrId }));
    return [...options, { value: RANDOM_VALUE, label: t("utils.random") }];
  }, [name, t]);

  const selectedAmrLabel = amrOptions?.find((o) => o.value === amrId)?.label;
  const selectedTypeLabel = SYNC_TYPES.find((o) => o.value === syncType)?.label;

  const submitMutation = useMutation({
    mutationFn: (payload: {
      amrId: string;
      syncType: string;
      url: string;
      currentMapId?: string;
    }) => client.post(`api/setting/${payload.url}`, payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setSyncType(undefined);
    },
    onError: () => void messageApi.error(t("utils.error")),
  });

  const submit = () => {
    if (!amrId || !syncType) {
      void messageApi.warning(t("utils.required"));
      return;
    }
    const url = SYNC_TYPE_URL[syncType] ?? DEFAULT_SYNC_URL;

    // 取回點位時,MiR 回來的 map_id 若不在 QAMS 裡,後端會拿 currentMapId 當退路;
    // 沒帶的話那些點位會被整批略過,所以這裡先擋下來。
    if (syncType === "retrieve_location") {
      if (!currentMapId) {
        void messageApi.error(t("map_manager.no_map_selected"));
        return;
      }
      submitMutation.mutate({ amrId, syncType, url, currentMapId });
      return;
    }

    submitMutation.mutate({ amrId, syncType, url });
  };

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <CloudSyncOutlined />
          SYNC DATA
        </SectionTitle>

        <Hint>把伺服器上的設定推送到指定車輛,或從車輛取回任務與點位。</Hint>

        <Field>
          <FieldLabel>{t("utils.amr_id")}</FieldLabel>
          <Select
            options={amrOptions}
            value={amrId}
            onChange={setAmrId}
            placeholder={t("utils.select")}
            allowClear
            style={{ width: "100%" }}
          />
        </Field>

        <Field>
          <FieldLabel>SYNC TYPE</FieldLabel>
          <TypeGrid>
            {SYNC_TYPES.map((opt) => (
              <TypeButton
                key={opt.value}
                type="button"
                $active={syncType === opt.value}
                onClick={() => setSyncType(opt.value)}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </TypeButton>
            ))}
          </TypeGrid>
        </Field>

        <CardFacts>
          <dt>{t("utils.amr_id")}</dt>
          <dd>{selectedAmrLabel ?? "—"}</dd>
          <dt>SYNC TYPE</dt>
          <dd>{selectedTypeLabel ?? "—"}</dd>
        </CardFacts>

        <Toolbar>
          <SolidButton
            onClick={submit}
            disabled={!amrId || !syncType || submitMutation.isLoading}
          >
            <SendOutlined />
            {t("utils.submit")}
          </SolidButton>
        </Toolbar>
      </Section>
    </PanelShell>
  );
};

export default SyncDataPanel;
