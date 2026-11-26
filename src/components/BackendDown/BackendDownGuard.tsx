import { FC } from "react";
import styled, { keyframes } from "styled-components";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { retryBackendNow, useBackendStatus } from "@/utils/backendStatus";

// 背景影片 (public/backend-down.webm): 海邊倉庫的傍晚, 車隊在充電座上休息; scripts/login-hero 的 rest.ts 逐格錄出來的, 無縫循環。
// 後端掛了才掛上這個元件, 平常不會下載影片
const VIDEO = `${import.meta.env.BASE_URL}backend-down.webm`;
const POSTER = `${import.meta.env.BASE_URL}backend-down.jpg`;

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
  justify-content: flex-start;
  padding: 24px 7vw;
  background: #120d10 url(${POSTER}) center / cover no-repeat;
  color: #f3ede8;
  overflow: hidden;

  /* 左邊壓暗, 字才看得清楚; 右邊留給畫面 */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(14, 9, 12, 0.72) 0%,
      rgba(14, 9, 12, 0.35) 45%,
      rgba(14, 9, 12, 0) 75%
    );
    pointer-events: none;
  }

  @media (max-width: 720px) {
    justify-content: center;
    &::after {
      background: rgba(14, 9, 12, 0.55);
    }
  }
`;

const Video = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const Card = styled.div`
  position: relative;
  z-index: 1;
  max-width: 440px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px 30px;
  border-radius: 16px;
  background: rgba(24, 16, 20, 0.42);
  border: 1px solid rgba(255, 235, 220, 0.14);
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
`;

const Dot = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f2a65a;
  box-shadow: 0 0 12px #f2a65a;
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
  align-self: flex-start;
  margin-top: 4px;
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  &:hover {
    background: rgba(255, 235, 220, 0.12);
  }
`;

/** 後端連不上時蓋住整個畫面, 每 3 秒自動重試, 恢復後自動消失 (邏輯在 utils/backendStatus) */
const BackendDownGuard: FC = () => {
  const { t } = useTranslation();
  const { down, lastCheck, since } = useBackendStatus();
  if (!down) return null;
  const fmt = (ms: number | null) =>
    ms ? dayjs(ms).format("YYYY-MM-DD HH:mm:ss") : "—";
  return (
    <Overlay role="alert">
      <Video
        aria-hidden
        src={VIDEO}
        poster={POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <Card>
        <Dot />
        <Title>{t("backend_down.title")}</Title>
        <Desc>{t("backend_down.desc")}</Desc>
        <Meta>
          <span>{t("backend_down.retrying")}</span>
          <span>{t("backend_down.since", { time: fmt(since) })}</span>
          <span>{t("backend_down.last_check", { time: fmt(lastCheck) })}</span>
        </Meta>
        <RetryBtn onClick={retryBackendNow}>
          {t("backend_down.retry_now")}
        </RetryBtn>
        <Meta>{t("backend_down.hint")}</Meta>
      </Card>
    </Overlay>
  );
};

export default BackendDownGuard;
