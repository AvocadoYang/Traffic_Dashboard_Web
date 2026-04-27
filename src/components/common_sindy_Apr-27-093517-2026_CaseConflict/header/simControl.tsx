import { Tooltip, Button } from "antd";
import { PoweroffOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { font } from "@/styles/variables";
import SimTime from "./SimTime";

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(255, 77, 79, 0); }
`;

const StatusWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  font-family: ${font.fontFamily.en};
`;

const StatusLabel = styled.span`
  font-size: ${font.size.xs};
  color: ${font.color.red};
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: ${font.weight.bold};
`;

const BaseButton = styled(Button)`
  font-family: ${font.fontFamily.en};
  text-transform: uppercase;
  font-size: ${font.size.xs};
  letter-spacing: 1px;
  height: 36px;
  font-weight: ${font.weight.semibold};
  display: flex !important;
  align-items: center;
  gap: 6px;
`;

const StopButton = styled(BaseButton)`
  background: #fff1f0 !important;
  border-color: ${font.color.red} !important;
  color: ${font.color.red} !important;
  animation: ${pulse} 2s ease-in-out infinite;

  &:hover {
    border-color: #ff7875 !important;
    color: #ff7875 !important;
  }
`;

const StartButton = styled(BaseButton)`
  background: #ffffff;
  border: 1px solid ${font.color.white};
  color: ${font.color.gray};

  &:hover {
    background: #f0f5ff;
    border-color: ${font.color.blue};
    color: ${font.color.blue};
  }
`;

type SimControlProps = {
  isSimulating: boolean;
  onStart: () => void;
  onStop: () => void;
};

const SimControl: React.FC<SimControlProps> = ({ isSimulating, onStart, onStop }) => {
  const { t } = useTranslation();

  if (isSimulating) {
    return (
      <>
        <StatusWrap>
          <ClockCircleOutlined style={{ fontSize: 16 }} />
          <StatusLabel>SIM TIME</StatusLabel>
          <SimTime />
        </StatusWrap>
        <Tooltip title={t("sim.start_sim_modal.inactive_sim")}>
          <StopButton onClick={onStop} icon={<PoweroffOutlined />}>
            STOP SIM
          </StopButton>
        </Tooltip>
      </>
    );
  }

  return (
    <Tooltip title={t("page_simulate")}>
      <StartButton
        onClick={onStart}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z" />
          </svg>
        }
      >
        SIMULATE
      </StartButton>
    </Tooltip>
  );
};

export default SimControl;