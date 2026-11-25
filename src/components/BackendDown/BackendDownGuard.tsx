import { FC } from "react";
import styled, { keyframes } from "styled-components";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { retryBackendNow, useBackendStatus } from "@/utils/backendStatus";

const pulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1); }
`;

// 蓋過所有東西 (聊天室 1000、各種 Modal), 但不卸載底下的畫面: 後端恢復後回到原本的頁面和狀態
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--c-bg, #0b0d10);
  color: var(--c-text, #e8eaed);
`;

const Card = styled.div`
  max-width: 480px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Dot = styled.span`
  align-self: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e5484d;
  animation: ${pulse} 1.6s ease-in-out infinite;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
`;

const Desc = styled.p`
  margin: 0;
  line-height: 1.7;
  opacity: 0.85;
`;

const Meta = styled.div`
  font-size: 12px;
  opacity: 0.6;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RetryBtn = styled.button`
  align-self: center;
  margin-top: 4px;
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

/** 後端連不上時蓋住整個畫面, 每 3 秒自動重試, 恢復後自動消失 (邏輯在 utils/backendStatus) */
const BackendDownGuard: FC = () => {
  const { t } = useTranslation();
  const { down, lastCheck, since } = useBackendStatus();
  if (!down) return null;
  const fmt = (ms: number | null) => (ms ? dayjs(ms).format("YYYY-MM-DD HH:mm:ss") : "—");
  return (
    <Overlay role="alert">
      <Card>
        <Dot />
        <Title>{t("backend_down.title")}</Title>
        <Desc>{t("backend_down.desc")}</Desc>
        <Meta>
          <span>{t("backend_down.retrying")}</span>
          <span>{t("backend_down.since", { time: fmt(since) })}</span>
          <span>{t("backend_down.last_check", { time: fmt(lastCheck) })}</span>
        </Meta>
        <RetryBtn onClick={retryBackendNow}>{t("backend_down.retry_now")}</RetryBtn>
        <Meta>{t("backend_down.hint")}</Meta>
      </Card>
    </Overlay>
  );
};

export default BackendDownGuard;
