import React from "react";
import { message, Tooltip, Form, Input, Space } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  UserOutlined,
  LockOutlined,
  CheckCircleFilled,
  CloseCircleFilled
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import styled, { keyframes, css } from "styled-components";
import { font } from "@/styles/variables";
import { StyledButton, titleSizes, bodySizes } from "@/styles/mixins";

// ======= 動畫 =======
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
`;

// ======= 背景 =======
const BackgroundContainer = styled.div`
  background-image: url("/View.svg");
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%);
    pointer-events: none;
  }

  // 768px 以上
  @media (min-width: 768px) {
    justify-content: flex-end;
    padding: 40px;
  }
`;

// ======= 登入卡片 =======
const LoginCard = styled.div`
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid ${font.color.white_2};
  border-left: 4px solid ${font.color.blue};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  font-family: ${font.fontFamily.en};
  width: 100%;
  max-width: 100%;
  padding: 32px 24px;

// 768px 以上
  @media (min-width: 768px) {
    max-width: 480px;
    padding: 48px;
  }
`;

// ======= Header =======
const LoginHeader = styled.div`
  margin-bottom: 40px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${font.color.blue};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const LoginTitle = styled.h1`
  ${titleSizes.large};
  color: ${font.color.blue};
`;

const SystemLabel = styled.div`
  ${titleSizes.xxs};
  color: ${font.color.gray};
`;

// ======= Form =======
const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    ${titleSizes.small};
    color: ${font.color.gray};
  }

  .ant-input,
  .ant-input-password {
    ${bodySizes.large};

    &:hover { border-color: ${font.color.blue}; }
    &:focus {
      border-color: ${font.color.blue};
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-input::placeholder,
  .ant-input-affix-wrapper input::placeholder {
    ${bodySizes.medium};
  }

 .ant-input-affix-wrapper {
  border: 1px solid ${font.color.white_2};
  border-radius: 5px;
  padding: 0 16px;

  &:hover { border-color: ${font.color.blue}; }

  &.ant-input-affix-wrapper-focused {
    border-color: ${font.color.blue};
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
  }

  .ant-input {
    height: 46px;
    border: none;
    box-shadow: none;
    &:focus { box-shadow: none; }
  }
}

.ant-input-prefix {
  color: ${font.color.border_gray_1};
  font-size: ${font.size["xl"]};
  margin-right: 12px;
}
`;

// ======= 忘記密碼 =======
const ForgotLink = styled.div`
  ${titleSizes.xxs};
  text-align: right;
  margin-bottom: 24px;
  color: ${font.color.gray};

  &:hover {
      color: ${font.color.blue};
    }
`;

// ======= 登入按鈕 =======
const LoginButton = styled(StyledButton) <{ $offline?: boolean }>`
  width: 100%;
   &:disabled {
    border: none;
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext y='20' font-size='20'%3E🚫%3C/text%3E%3C/svg%3E") 12 12, not-allowed;
  }
`;

// ======= 底部狀態列 =======
const StatusBar = styled.div`
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid ${font.color.border_gray_2} ;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusDot = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;

  ${({ $active }) =>
    $active &&
    css`
      animation: ${pulse} 2s infinite;
    `}
`;

const StatusText = styled.span<{ $active?: boolean }>`
  ${titleSizes.xxs};
  color: ${({ $active }) =>
    $active ? font.color.green : font.color.border_gray_1};
`;

// ======= 元件 =======
const Login: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [isActive, setIsActive] = React.useState<boolean | null>(null);

  // 判斷是否連線
  React.useEffect(() => {
    const socket = io("http://localhost:4000", {
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 2000
    });

    socket.on("connect", () => {
      console.log("🟢 connected");
      setIsActive(true);
    });

    socket.on("connect_error", () => {
      console.log("❌ connect error");
      setIsActive(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const editMutation = useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      client.post("api/logInAndOut/login", payload),
    onSuccess: (res) => {
      localStorage.setItem("token", res.data.token);
      messageApi.success(t("utils.success"));
      navigate("/", { replace: true });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleSubmit = (values: unknown) => {
    editMutation.mutate(values as { username: string; password: string });
  };

  return (
    <>
      {contextHolder}
      <BackgroundContainer>
        <LoginCard>

          <LoginHeader>
            <LoginTitle>LOGIN</LoginTitle>
            <SystemLabel>Warehouse Management System</SystemLabel>
          </LoginHeader>

          <StyledForm layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="USERNAME"
              name="username"
              rules={[{ required: true, message: "User ID required" }]}
            >
              <Input placeholder="Enter user ID" prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item
              label="PASSWORD"
              name="password"
              rules={[{ required: true, message: "Password required" }]}
            >
              <Input.Password
                placeholder="Enter password"
                prefix={<LockOutlined />}
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Tooltip
              title="Sorry, you cannot recover your account. This function is still in beta 😣"
              placement="topRight">
              <ForgotLink>
                Forgot password?
              </ForgotLink>
            </Tooltip>
            <Form.Item >
              <LoginButton
                size="large"
                htmlType="submit"
                loading={editMutation.isPending}
                disabled={isActive === false}
              >
                {editMutation.isPending ? "AUTHENTICATING..." : "LOGIN"}
              </LoginButton>
            </Form.Item>
          </StyledForm>

          <StatusBar>
            <Space align="center" size="small">
              <StatusDot $active={isActive === true}>
                {isActive === true ? (
                  <CheckCircleFilled style={{ color: "#52c41a" }} />
                ) : (
                  <CloseCircleFilled style={{ color: "#ff4d4f" }} />
                )}
              </StatusDot>

              <StatusText $active={isActive === true}>
                {isActive === null
                  ? "Connecting..."
                  : isActive
                    ? "System Online"
                    : "System Offline"}
              </StatusText>
            </Space>

            <StatusText>v2.0.1</StatusText>
          </StatusBar>

        </LoginCard>
      </BackgroundContainer>
    </>
  );
};

export default Login;