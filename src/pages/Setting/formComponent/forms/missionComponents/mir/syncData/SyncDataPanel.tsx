import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import FormHr from "@/pages/Setting/utils/FormHr";
import { useMutation } from "@tanstack/react-query";
import { Button, message, Select, Typography } from "antd";
import {
  ApartmentOutlined,
  BorderOutlined,
  AimOutlined,
  EnvironmentOutlined,
  SendOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import React, { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const { Text } = Typography;

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%; /* 或用 calc(100vh - xxx) 依你的 layout 而定 */
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 6px 8px;
  margin: 0 0 20px 0;
  font-family: "Roboto Mono", monospace;
  color: #262626;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px;
  cursor: move;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f5ff;
    border-left-color: #40a9ff;
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 4px 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #8c8c8c;

  &::before {
    content: "";
    width: 3px;
    height: 12px;
    background: #1890ff;
    display: inline-block;
  }
`;

const AmrSelect = styled(Select)`
  width: 100%;
  font-family: "Roboto Mono", monospace;

  .ant-select-selector {
    border-radius: 4px !important;
    border-color: #d9d9d9 !important;
  }
`;

const SyncTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

const SyncTypeButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;

  border: 1px solid ${({ $active }) => ($active ? "#1890ff" : "#d9d9d9")};
  background: ${({ $active }) => ($active ? "#e6f4ff" : "#fafafa")};
  color: ${({ $active }) => ($active ? "#1890ff" : "#595959")};
  box-shadow: ${({ $active }) =>
    $active ? "inset 0 0 0 1px #1890ff" : "none"};

  &:hover {
    border-color: #40a9ff;
    color: #1890ff;
  }

  .anticon {
    font-size: 18px;
  }
`;

const CheckBadge = styled(CheckCircleFilled)`
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 12px;
  color: #1890ff;
`;

const SummaryBar = styled.div`
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  padding: 10px 12px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #595959;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;

  span:first-child {
    color: #8c8c8c;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 10px;
  }
`;

const SubmitButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  height: 40px;
  background: #1e2a4a;
  border-color: #1e2a4a;

  &:hover,
  &:focus {
    background: #2a3a63 !important;
    border-color: #2a3a63 !important;
  }
`;

const RANDOM_VALUE = "null";

const SYNC_TYPE_OPTIONS = [
  { value: "mission", label: "Mission", icon: <ApartmentOutlined /> },
  { value: "footprint", label: "Footprint", icon: <BorderOutlined /> },
  { value: "marker_type", label: "Marker Type", icon: <AimOutlined /> },
  { value: "location", label: "Location", icon: <EnvironmentOutlined /> },
];

const SyncDataPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { data: name } = useName();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [amrId, setAmrId] = useState<string | undefined>(undefined);
  const [syncType, setSyncType] = useState<string | undefined>(undefined);

  const AmrOption: { value: string; label: string }[] | undefined =
    useMemo(() => {
      let options;
      if (name?.isSim) {
        options = name.amrs
          .filter((a) => a.isReal === false)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      } else {
        options = name?.amrs
          .filter((a) => a.isReal === true)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      }
      return options
        ? [...options, { value: RANDOM_VALUE, label: t("utils.random") }]
        : undefined;
    }, [name, t]);

  const selectedAmrLabel = useMemo(
    () => AmrOption?.find((o) => o.value === amrId)?.label,
    [AmrOption, amrId],
  );
  const selectedTypeLabel = useMemo(
    () => SYNC_TYPE_OPTIONS.find((o) => o.value === syncType)?.label,
    [syncType],
  );

  const submitMutation = useMutation({
    mutationFn: (payload: { amrId: string; syncType: string }) => {
      return client.post("api/setting/mir-sync-data", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setSyncType(undefined);
    },
    onError: () => {
      void messageApi.error(t("utils.error"));
    },
  });

  const canSubmit = Boolean(amrId) && Boolean(syncType);

  const handleSubmit = () => {
    if (!amrId || !syncType) {
      void messageApi.warning("請先選擇車輛與同步項目");
      return;
    }
    submitMutation.mutate({ amrId, syncType });
  };

  return (
    <IndustrialContainer>
      {contextHolder}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: "100%",
        }}
      >
        <PanelHeader {...listeners} {...attributes}>
          Sync Data
        </PanelHeader>
        <FormHr />

        <Body>
          <Section>
            <SectionLabel>選擇車輛</SectionLabel>
            <AmrSelect
              options={AmrOption}
              value={amrId}
              onChange={(v) => setAmrId(v as string)}
              placeholder="SELECT AMR"
              allowClear
            />
          </Section>

          <Section>
            <SectionLabel>選擇同步項目</SectionLabel>
            <SyncTypeGrid>
              {SYNC_TYPE_OPTIONS.map((opt) => {
                const active = syncType === opt.value;
                return (
                  <SyncTypeButton
                    key={opt.value}
                    type="button"
                    $active={active}
                    onClick={() => setSyncType(opt.value)}
                  >
                    {active && <CheckBadge />}
                    {opt.icon}
                    <span>{opt.label}</span>
                  </SyncTypeButton>
                );
              })}
            </SyncTypeGrid>
          </Section>

          <SummaryBar>
            <SummaryRow>
              <span>Vehicle</span>
              <Text code>{selectedAmrLabel ?? "—"}</Text>
            </SummaryRow>
            <SummaryRow>
              <span>Sync Type</span>
              <Text code>{selectedTypeLabel ?? "—"}</Text>
            </SummaryRow>
          </SummaryBar>

          <SubmitButton
            type="primary"
            icon={<SendOutlined />}
            loading={submitMutation.isPending}
            disabled={!canSubmit}
            onClick={handleSubmit}
            block
          >
            送出
          </SubmitButton>
        </Body>
      </div>
    </IndustrialContainer>
  );
};

export default SyncDataPanel;