import React from "react";
import { Col, message, Row, Tooltip, Form, Input, Button, Space } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  UserOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const BackgroundContainer = styled.div`
  background-image: url("/View.svg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 40px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.3) 0%,
      rgba(0, 0, 0, 0.1) 100%
    );
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 20px;
    justify-content: center;
  }
`;

const LoginCard = styled.div`
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 48px;
  width: 100%;
  max-width: 480px;
  font-family: "Roboto Mono", monospace;

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
  border-top: 1px solid #e8e8e8;
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
              trigger="click"
            >
              <ForgotLink>
                <a>Forgot password?</a>
              </ForgotLink>
            </Tooltip>

            <Form.Item style={{ marginBottom: 0 }}>
              <IndustrialButton
                type="primary"
                htmlType="submit"
                block
                loading={editMutation.isPending}
              >
                {editMutation.isPending ? "AUTHENTICATING..." : "LOGIN"}
              </IndustrialButton>
            </Form.Item>
          </StyledForm>

          <StatusBar>
            <Space align="center" size="small">
              <StatusDot $active />
              <StatusText>System Online</StatusText>
            </Space>
            <StatusText>v2.0.1</StatusText>
          </StatusBar>
        </LoginCard>
      </BackgroundContainer>
    </>
  );
};

export default Login;
