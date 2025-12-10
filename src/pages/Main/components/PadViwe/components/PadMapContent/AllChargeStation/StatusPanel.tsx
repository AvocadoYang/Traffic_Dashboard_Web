import { FC } from "react";
import { Button, Flex, message, Modal } from "antd";
import { useSetAtom } from "jotai";
import { OpenChargeStationModal } from "@/pages/Main/global/jotai";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  ThunderboltOutlined,
  StopOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";
import dayjs from "dayjs";

// Industrial Styled Components
const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #faad14;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #262626;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-body {
    padding: 32px 24px;
    background: #fafafa;
  }

  .ant-modal-close {
    color: #8c8c8c;

    &:hover {
      color: #262626;
    }
  }
`;

const ControlPanel = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const StatusHeader = styled.div`
  background: #fff7e6;
  border: 1px solid #ffa940;
  border-left: 4px solid #faad14;
  padding: 12px 16px;
  margin-bottom: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LocationBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const StatusText = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #595959;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ControlButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 48px;
  padding: 0 32px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 200px;

  &.start-btn {
    background: #f6ffed;
    border: 2px solid #52c41a;
    color: #52c41a;

    &:hover:not(:disabled) {
      background: #52c41a;
      border-color: #52c41a;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4);
      transform: translateY(-2px);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }
  }

  &.stop-btn {
    background: #fff1f0;
    border: 2px solid #ff4d4f;
    color: #ff4d4f;

    &:hover:not(:disabled) {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
      transform: translateY(-2px);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }
  }

  .anticon {
    font-size: 18px;
  }
`;

const InfoSection = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 1px;
  min-width: 120px;
`;

const InfoValue = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #262626;
  font-weight: 600;
`;

const StatusPanel: FC<{ locId: string | null }> = ({ locId }) => {
  const socketState = useChargeStationSocket();
  const setChargeConfig = useSetAtom(OpenChargeStationModal);
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const handleClose = () => setChargeConfig(null);

  const testMutation = useMutation({
    mutationFn: (payload: { locationId: string; cmd: string }) =>
      client.post("api/test/charge-station-bar", payload),
    onSuccess: (_, variables) => {
      if (variables.cmd === "start") {
        messageApi.success("CHARGING STARTED");
      } else {
        messageApi.info("CHARGING STOPPED");
      }
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });
  const station = locId ? socketState[locId] : null;

  const handleBar = (cmd: string) => {
    if (!locId) {
      messageApi.error("LOCATION NOT FOUND");
      return;
    }
    testMutation.mutate({ locationId: locId, cmd });
  };

  return (
    <>
      {contextHolder}

      <IndustrialModal
        open={!!locId}
        onCancel={handleClose}
        footer={null}
        width={700}
        title={
          <Flex align="center" gap="small">
            <ThunderboltOutlined style={{ color: "#faad14" }} />
            CHARGE STATION CONTROL
          </Flex>
        }
      >
        <ControlPanel>
          <StatusHeader>
            <PoweroffOutlined style={{ fontSize: 20, color: "#faad14" }} />
            <div style={{ flex: 1 }}>
              <StatusText>CHARGE STATION STATUS</StatusText>
            </div>
          </StatusHeader>

          <InfoSection>
            <InfoRow>
              <InfoLabel>Location ID:</InfoLabel>
              <LocationBadge>{locId || "N/A"}</LocationBadge>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Last Heartbeat:</InfoLabel>
              <InfoValue style={{ color: "#52c41a" }}>
                {station?.leastHeartbeatTime
                  ? dayjs(station.leastHeartbeatTime).format(
                      "YYYY-MM-DD HH:mm:ss"
                    )
                  : "-"}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Heartbeat:</InfoLabel>
              <InfoValue
                style={{
                  color: station?.isStationCodeAlive ? "#52c41a" : "#c41a1a",
                }}
              >
                ● {station?.isStationCodeAlive ? "CONNECTED" : "DISCONNECT"}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>MQTT Connection:</InfoLabel>
              <InfoValue
                style={{
                  color: station?.isMQTTConnect ? "#52c41a" : "#c41a1a",
                }}
              >
                ● {station?.isMQTTConnect ? "CONNECTED" : "DISCONNECT"}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>TCP Connection:</InfoLabel>
              <InfoValue
                style={{ color: station?.isTCPConnect ? "#52c41a" : "#c41a1a" }}
              >
                ● {station?.isTCPConnect ? "CONNECTED" : "DISCONNECT"}
              </InfoValue>
            </InfoRow>
          </InfoSection>

          <Flex gap="large" justify="center" align="center" vertical={false}>
            <ControlButton
              className="start-btn"
              onClick={() => handleBar("start")}
              loading={testMutation.isPending}
              icon={<ThunderboltOutlined />}
            >
              Start Charging
            </ControlButton>

            <ControlButton
              className="stop-btn"
              onClick={() => handleBar("stop")}
              loading={testMutation.isPending}
              icon={<StopOutlined />}
            >
              Stop Charging
            </ControlButton>
          </Flex>
        </ControlPanel>
      </IndustrialModal>
    </>
  );
};

export default StatusPanel;
