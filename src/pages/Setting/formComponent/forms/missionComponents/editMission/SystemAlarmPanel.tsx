import { FC, useEffect, useState } from "react";
import { Table, Switch, Typography, Form } from "antd";
import { io } from "@/sockets/socketConnect";
import styled from "styled-components";
import FormHr from "@/pages/Setting/utils/FormHr";
import { useTranslation } from "react-i18next";

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

interface SystemAlarmConfig {
  [code: number]: {
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

  useEffect(() => {
    const handleConfig = (data: SystemAlarmConfig) => {
      setConfig(data);
    };

    io.on("system-alarm-config", handleConfig);

    return () => {
      io.off("system-alarm-config", handleConfig);
    };
  }, []);

  const handleChange = (code: number, enable: boolean) => {
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
    code: Number(code),
    enable: value.enable,
    description: value.description,
  }));

  return (
    <>
      <IndustrialContainer>
        <PanelHeader {...listeners} {...attributes}>
          {t("mission.add_mission.title")}
        </PanelHeader>
        <FormHr />
        <Typography.Title level={4}>System Alarm</Typography.Title>

        <Table
          rowKey="code"
          pagination={false}
          dataSource={dataSource}
          columns={[
            {
              title: "Alarm Code",
              dataIndex: "code",
            },
            {
              title: "description",
              dataIndex: "description",
            },
            {
              title: "Enable",
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
