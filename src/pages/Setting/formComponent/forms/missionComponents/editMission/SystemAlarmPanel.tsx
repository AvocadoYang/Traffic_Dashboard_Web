import { FC, useEffect, useState } from "react";
import { Table, Switch } from "antd";
import { io } from "@/sockets/socketConnect";
import styled from "styled-components";
import FormHr from "@/pages/Setting/utils/FormHr";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import {
  ALARM_ACCENT,
  ALARM_TYPES,
  systemAlarmTypeFilter,
} from "@/utils/systemAlarmFilter";

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 12px 16px;
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

const SectionLabel = styled.div`
  color: #262626;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SectionHint = styled.div`
  color: #8c8c8c;
  font-size: 11px;
  margin-top: 4px;
`;

const TypeSwitchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin: 12px 0 20px;
`;

const TypeSwitchItem = styled.label<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #d9d9d9;
  border-left: 3px solid ${(props) => props.$accent};
  border-radius: 4px;
  background: #fafafa;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
`;

interface SystemAlarmConfig {
  [code: string]: {
    enable: boolean;
    description: string;
  };
}

const SystemAlarmPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<SystemAlarmConfig>({});
  const [typeFilter, setTypeFilter] = useAtom(systemAlarmTypeFilter);

  useEffect(() => {
    const handleConfig = (data: SystemAlarmConfig) => {
      setConfig(data);
    };

    io.on("system-alarm-config", handleConfig);

    return () => {
      io.off("system-alarm-config", handleConfig);
    };
  }, []);

  const handleChange = (code: string, enable: boolean) => {
    io.emit("set-system-alarm", {
      code,
      enable,
    });

    setConfig((prev) => ({
      ...prev,
      [code]: {
        enable,
        description: prev.description,
      },
    }));
  };

  const dataSource = Object.entries(config).map(([code, value]) => ({
    key: code,
    code: code,
    enable: value.enable,
    description: value.description,
  }));

  return (
    <>
      <IndustrialContainer>
        <PanelHeader {...listeners} {...attributes}>
          {t("system_alarm.title")}
        </PanelHeader>
        <FormHr />

        <SectionLabel>{t("system_alarm.type_filter")}</SectionLabel>
        <SectionHint>{t("system_alarm.type_filter_hint")}</SectionHint>
        <TypeSwitchGrid>
          {ALARM_TYPES.map((type) => (
            <TypeSwitchItem key={type} $accent={ALARM_ACCENT[type]}>
              <Switch
                size="small"
                checked={typeFilter[type]}
                onChange={(checked) => setTypeFilter(type, checked)}
              />
              {t(`system_alarm.type.${type}`)}
            </TypeSwitchItem>
          ))}
        </TypeSwitchGrid>

        <Table
          rowKey="code"
          pagination={false}
          dataSource={dataSource}
          columns={[
            {
              title: t("system_alarm.alarm_code"),
              dataIndex: "code",
            },
            {
              title: t("system_alarm.description"),
              dataIndex: "description",
            },
            {
              title: t("system_alarm.enable"),
              render: (_, record) => (
                <Switch
                  checked={record.enable}
                  onChange={(checked) => handleChange(record.code, checked)}
                />
              ),
            },
          ]}
        />
      </IndustrialContainer>
    </>
  );
};

export default SystemAlarmPanel;
