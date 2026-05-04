import { Tooltip, Button } from "antd";
import { PoweroffOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { titleSizes } from "@/styles/mixins";
import SimTime from "./SimTime";

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(255, 77, 79, 0); }
`;

// ─── Desktop Styles ──────────────────────────────────────
const BaseButton = styled(Button)`
  ${titleSizes.xs};
  background: #ffffff;
  border: 1px solid #d9d9d9;
  height: 36px;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  .anticon {
    font-size: 18px;
  }
`;

const StopButton = styled(BaseButton)`
  border-color: #ff4d4f !important;
  color: #ff4d4f !important;
  background: #fff1f0 !important;
  animation: ${pulse} 2s ease-in-out infinite;

  &:hover {
    background: #ffe7e7 !important;
    color: #cf1322 !important;
    box-shadow: 0 2px 12px rgba(255, 77, 79, 0.3);
  }
`;

const StartButton = styled(BaseButton)`
  border-color: #595959;
  color: #595959;
  background: #fafafa;

  &:hover {
    background: #f5f5f5;
    border-color: #262626;
    color: #262626;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }
`;

const SimStatusWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ff4d4f;
`;

const SimStatusLabel = styled.span`
  ${titleSizes.xs};
  letter-spacing: 1px;
  font-weight: 700;
`;

// ─── Mobile Styles ───────────────────────────────────────
const MobileNavItem = styled.button<{ $color: string; $bg: string }>`
  ${titleSizes.xxs};
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  border-top: 3px solid transparent;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  cursor: pointer;

  &:active {
    filter: brightness(0.9);
  }
`;

const MobileStopItem = styled(MobileNavItem)`
  animation: ${pulse} 2s ease-in-out infinite;
`;

// ─── Types ───────────────────────────────────────────────
type SimControlProps = {
  isSimulating: boolean;
  onStart: () => void;
  onStop: () => void;
  isMobile?: boolean;
};

const SimControl: React.FC<SimControlProps> = ({ isSimulating, onStart, onStop, isMobile = false }) => {
  const { t } = useTranslation();

  // ── Mobile ──
  if (isMobile) {
    if (isSimulating) {
      return (
        <MobileStopItem $color="#ff4d4f" $bg="#fff1f0" onClick={onStop}>
          <PoweroffOutlined style={{ fontSize: 16 }} />
          STOP
        </MobileStopItem>
      );
    }
    return (
      <MobileNavItem $color="#595959" $bg="#fafafa" onClick={onStart}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z" />
        </svg>
        {t("page_simulate")}
      </MobileNavItem>
    );
  }

  // ── Desktop ──
  if (isSimulating) {
    return (
      <>
        <SimStatusWrap>
          <ClockCircleOutlined style={{ fontSize: 16 }} />
          <SimStatusLabel>SIM TIME</SimStatusLabel>
          <SimTime />
        </SimStatusWrap>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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