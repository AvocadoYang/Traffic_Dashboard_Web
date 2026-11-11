import React, { useRef, useState } from "react";
import { Alert, Col, message, Row, Tooltip, Form, Input, Button, Space } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  UserOutlined,
  LockOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HOME_PAGES, MyProfile, PROFILE_KEY } from "@/api/useProfile";
import { CHAT_KEY } from "@/api/useSiteChat";
import { CHAT_CHECK_KEY } from "@/utils/session";
import client from "@/api/axiosClient";
import { reconnectSocket } from "@/sockets/socketConnect";
import { Err } from "@/utils/responseErr";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { useSetAtom } from "jotai";
import { ignitionAtom, prefersReducedMotion } from "@/components/Ignition/ignitionState";
import HeroOverlay from "./HeroOverlay";

// 背景影片 (public/login-hero.webm): 用車型的 3D 模型在無頭瀏覽器裡逐格錄出來的, 約 27 秒循環 (開頭是暗的光影揭幕)
const HERO_VIDEO = `${import.meta.env.BASE_URL}login-hero.webm`;
const HERO_POSTER = `${import.meta.env.BASE_URL}login-hero.jpg`;

const cardIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
// 登入成功後的退場: 卡片模糊淡出, 背景影片推近並暗到全黑, 接著由點火轉場 (components/Ignition) 接手
const cardOut = keyframes`
  to { opacity: 0; transform: translateY(-12px) scale(0.98); filter: blur(8px); }
`;
/** 退場要多久才換頁 (影片暗到全黑) */
const LEAVE_MS = 900;

const BackgroundContainer = styled.div`
  background: #05070b;
  min-height: 100vh;
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 40px 6vw 40px 40px;
  position: relative;
  overflow: hidden;

  /* 右側壓暗, 登入卡片才看得清楚; 左邊留給影片 */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(90deg, rgba(5, 7, 11, 0) 35%, rgba(5, 7, 11, 0.72) 100%),
      linear-gradient(0deg, rgba(5, 7, 11, 0.55) 0%, rgba(5, 7, 11, 0) 30%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 20px;
    justify-content: center;
  }
`;

const HeroLayer = styled.div<{ $leaving: boolean }>`
  position: absolute;
  inset: 0;
  transition:
    transform 1.1s cubic-bezier(0.5, 0, 0.3, 1),
    filter 0.9s ease-in;
  ${(p) =>
    p.$leaving &&
    css`
      transform: scale(1.12);
      filter: brightness(0);
    `}
`;

const HeroVideo = styled.video`
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

const HeroPoster = styled.div`
  position: absolute;
  inset: 0;
  background: url(${HERO_POSTER}) center / cover no-repeat;
`;

const LoginCard = styled.div<{ $leaving: boolean }>`
  position: relative;
  z-index: 2;
  background: rgba(10, 14, 20, 0.55);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-left: 3px solid var(--c-header-accent);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  padding: 48px;
  width: 100%;
  max-width: 440px;
  font-family: "Roboto Mono", monospace;
  animation: ${cardIn} 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  ${(p) =>
    p.$leaving &&
    css`
      animation: ${cardOut} 0.5s 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; /* 晚一點淡出, 先看得到按鈕亮一下 */
      pointer-events: none;
    `}

  /* 卡片固定是深色, 不跟主題: 文字、輸入框在這裡自己定 */
  --c-text-secondary: rgba(255, 255, 255, 0.72);
  --c-text-muted: rgba(255, 255, 255, 0.5);
  --c-header-border: rgba(255, 255, 255, 0.2);
  --c-bg: rgba(255, 255, 255, 0.06);
  color: #fff;

  .ant-input,
  .ant-input-affix-wrapper {
    color: #fff;
  }
  .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.38);
  }
  .ant-input:-webkit-autofill {
    -webkit-text-fill-color: #fff;
    transition: background-color 9999s;
  }
  .ant-input-password-icon,
  .ant-input-password-icon:hover {
    color: rgba(255, 255, 255, 0.6);
  }

  @media (max-width: 768px) {
    max-width: 100%;
    padding: 32px 24px;
  }
`;

const LoginHeader = styled.div`
  margin-bottom: 40px;
  border-bottom: 2px solid var(--c-header-accent);
  padding-bottom: 16px;
`;

const LoginTitle = styled.h1`
  font-family: "Roboto Mono", monospace;
  font-size: 28px;
  font-weight: 700;
  color: var(--c-header-accent);
  text-transform: uppercase;
  letter-spacing: 3px;
  margin: 0;
  text-align: center;

  &::before {
    content: "[";
    margin-right: 8px;
    color: var(--c-warning);
  }

  &::after {
    content: "]";
    margin-left: 8px;
    color: var(--c-warning);
  }
`;

const SystemLabel = styled.div`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  color: var(--c-text-secondary);
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
  margin-top: 8px;
  font-weight: 600;
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--c-text-secondary);
    font-weight: 600;
  }

  .ant-input,
  .ant-input-password {
    font-family: "Roboto Mono", monospace;
    border: 1px solid var(--c-header-border);
    border-radius: 0;
    height: 48px;
    font-size: 13px;
    background: var(--c-bg);

    &:hover {
      border-color: var(--c-header-accent);
    }

    &:focus {
      border-color: var(--c-header-accent);
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-input-affix-wrapper {
    font-family: "Roboto Mono", monospace;
    border: 1px solid var(--c-header-border);
    border-radius: 0;
    padding: 0 16px;
    background: var(--c-bg);

    &:hover {
      border-color: var(--c-header-accent);
    }

    &.ant-input-affix-wrapper-focused {
      border-color: var(--c-header-accent);
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }

    .ant-input {
      height: 46px;
      border: none;
      box-shadow: none;

      &:focus {
        box-shadow: none;
      }
    }
  }

  .ant-input-prefix {
    color: var(--c-text-muted);
    font-size: 16px;
    margin-right: 12px;
  }

  .ant-input-suffix {
    color: var(--c-text-muted);
  }
`;

const IndustrialButton = styled(Button)`
  background: var(--c-header-accent);
  border: 1px solid var(--c-header-accent);
  color: #ffffff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 13px;
  letter-spacing: 2px;
  height: 48px;
  font-weight: 700;
  border-radius: 0;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);

  &:hover {
    background: var(--c-header-accent);
    border-color: var(--c-header-accent);
    color: #ffffff;
    box-shadow: 0 6px 16px rgba(24, 144, 255, 0.5);
    transform: translateY(-2px);
  }

  &:active {
    background: #0c7cd5;
    border-color: #0c7cd5;
    transform: translateY(0);
  }

  &:disabled {
    background: var(--c-header-border);
    border-color: var(--c-header-border);
    color: var(--c-text-muted);
  }
`;

// 登入鈕的掃光: 驗證中一直掃, 成功時亮一下再掃一次 (光是疊在按鈕上的另一層, 不動 antd 按鈕本身)
const sheen = keyframes`
  from { transform: translateX(-120%) skewX(-20deg); }
  to { transform: translateX(380%) skewX(-20deg); }
`;
const ButtonGlow = styled.div<{ $state: "idle" | "pending" | "go" }>`
  position: relative;

  .sheen {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;

    &::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 30%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
      transform: translateX(-120%) skewX(-20deg);
    }
  }
  ${(p) =>
    p.$state === "pending" &&
    css`
      .sheen::after {
        animation: ${sheen} 1.2s ease-in-out infinite;
      }
    `}
  ${(p) =>
    p.$state === "go" &&
    css`
      .sheen::after {
        animation: ${sheen} 0.55s ease-out both;
      }
      .ant-btn {
        filter: brightness(1.25);
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.35),
          0 0 36px 6px color-mix(in srgb, var(--c-header-accent) 65%, transparent);
        transition:
          filter 0.2s,
          box-shadow 0.2s;
      }
    `}
`;

const ForgotLink = styled.div`
  text-align: right;
  margin-bottom: 24px;

  a {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    color: var(--c-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-decoration: none;
    transition: all 0.2s;

    &:hover {
      color: var(--c-header-accent);
      text-decoration: underline;
    }
  }
`;

const StatusBar = styled.div`
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusDot = styled.div<{ $active?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(props) => (props.$active ? "var(--c-success)" : "var(--c-header-border)")};
  box-shadow: ${(props) =>
    props.$active ? "0 0 8px rgba(82, 196, 26, 0.6)" : "none"};
  animation: ${(props) => (props.$active ? "pulse 2s infinite" : "none")};

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const StatusText = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();

  const [capsLock, setCapsLock] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const heroVideo = useRef<HTMLVideoElement>(null);
  const setIgnition = useSetAtom(ignitionAtom);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const logoutReason = searchParams.get("reason");

  const editMutation = useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      client.post("api/logInAndOut/login", payload),
    onSuccess: async (res, payload) => {
      localStorage.setItem("token", res.data.token);
      reconnectSocket();
      // 上一個帳號的個人設定 / 聊天室不要留給這個帳號
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.removeQueries({ queryKey: CHAT_KEY });
      try {
        sessionStorage.setItem(CHAT_CHECK_KEY, "1");
      } catch {
        /* 聊天室不會自動打開而已 */
      }
      // 成功不另外跳提示: 退場動畫 + 點火轉場就是回饋; 系統設定「減少動態效果」時直接換頁
      const motion = !prefersReducedMotion();
      if (motion) setLeaving(true);
      const settled = new Promise((r) => window.setTimeout(r, motion ? LEAVE_MS : 0));
      // 個人設定的預設首頁; 讀不到 (舊後端) 就回首頁
      let home = "/";
      let name = payload.username;
      try {
        const me = await client.get<MyProfile>("api/profile/me");
        queryClient.setQueryData(PROFILE_KEY, me.data);
        const page = me.data.preferences?.homePage;
        if (page && (HOME_PAGES as readonly string[]).includes(page)) home = page;
        name = me.data.account || name;
      } catch {
        /* 舊後端沒有 /api/profile */
      }
      await settled;
      if (motion) setIgnition({ name });
      navigate(home, { replace: true });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleSubmit = (values: unknown) => {
    if (leaving) return;
    editMutation.mutate(values as { username: string; password: string });
  };

  return (
    <>
      {contextHolder}
      <BackgroundContainer>
        <HeroLayer $leaving={leaving}>
          <HeroPoster aria-hidden />
          <HeroVideo ref={heroVideo} aria-hidden src={HERO_VIDEO} poster={HERO_POSTER} autoPlay muted loop playsInline preload="auto" />
        </HeroLayer>
        {/* 影片上跟著鏡頭換的車型名稱、規格、章節進度條 */}
        <HeroOverlay video={heroVideo} hidden={leaving} />
        <LoginCard $leaving={leaving}>
          <LoginHeader>
            <LoginTitle>{t("login.title")}</LoginTitle>
            <SystemLabel>{t("login.system_label")}</SystemLabel>
          </LoginHeader>

          {logoutReason && ["idle", "expired", "disabled"].includes(logoutReason) && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title={t(`profile.logout_reason.${logoutReason as "idle" | "expired" | "disabled"}`)}
            />
          )}
          <StyledForm layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label={t("login.username")}
              name="username"
              rules={[{ required: true, message: t("login.username_required") }]}
            >
              <Input placeholder={t("login.username_placeholder")} prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item
              label={t("login.password")}
              name="password"
              rules={[{ required: true, message: t("login.password_required") }]}
              extra={
                capsLock ? (
                  <span style={{ color: "var(--c-warning)" }}>
                    <WarningOutlined /> {t("login.caps_lock")}
                  </span>
                ) : undefined
              }
            >
              <Input.Password
                placeholder={t("login.password_placeholder")}
                prefix={<LockOutlined />}
                onKeyDown={(e) => {
                  if (e.key !== "CapsLock") return setCapsLock(e.getModifierState("CapsLock"));
                  // 按 Caps Lock 本身時, Windows / Linux 回報的是切換前的狀態, 直接反轉; Mac 只會在開啟時送 keydown
                  if (e.repeat) return;
                  if (/Mac/i.test(navigator.platform)) setCapsLock(e.getModifierState("CapsLock"));
                  else setCapsLock((v) => !v);
                }}
                onKeyUp={(e) => {
                  if (e.key === "CapsLock") {
                    if (/Mac/i.test(navigator.platform)) setCapsLock(false);
                    return;
                  }
                  setCapsLock(e.getModifierState("CapsLock"));
                }}
                onBlur={() => setCapsLock(false)}
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Tooltip
              title={t("login.forgot_tooltip")}
              trigger="click"
            >
              <ForgotLink>
                <a>{t("login.forgot_password")}</a>
              </ForgotLink>
            </Tooltip>

            <Form.Item style={{ marginBottom: 0 }}>
              <ButtonGlow $state={leaving ? "go" : editMutation.isPending ? "pending" : "idle"}>
                <IndustrialButton
                  type="primary"
                  htmlType="submit"
                  block
                  loading={editMutation.isPending && !leaving /* onSuccess 跑完之前都算 pending, 退場時不要轉圈 */}
                >
                  {leaving
                    ? t("login.starting")
                    : editMutation.isPending
                      ? t("login.authenticating")
                      : t("login.title")}
                </IndustrialButton>
                <span className="sheen" aria-hidden />
              </ButtonGlow>
            </Form.Item>
          </StyledForm>

          <StatusBar>
            <Space align="center" size="small">
              <StatusDot $active />
              <StatusText>{t("login.system_online")}</StatusText>
            </Space>
            <StatusText>v2.0.1</StatusText>
          </StatusBar>
        </LoginCard>
      </BackgroundContainer>
    </>
  );
};

export default Login;
