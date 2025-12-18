import React from "react";
import "./login.css";
import { Col, message, Row, Tooltip, Form, Input, Button, Space } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { useTranslation } from "react-i18next";

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

  const handleSubmit = (values: { username: string; password: string }) => {
    editMutation.mutate(values);
  };

  return (
    <>
      {contextHolder}
      <div className="background">
        <Row>
          <Col span={12} />
          <Col span={12}>
            <div className="From-Wrap">
              <div className="wrapper">
                <h1>LogIn</h1>

                <Form
                  layout="vertical"
                  onFinish={handleSubmit}
                  style={{ width: "80%" }}
                >
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: "User ID required" }]}
                  >
                    <Input placeholder="User ID" prefix={<UserOutlined />} />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: "Password required" }]}
                  >
                    <Input.Password
                      placeholder="input password"
                      iconRender={(visible) =>
                        visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                      }
                    />
                  </Form.Item>

                  <Tooltip
                    title="sorry, you can not recovery you account, the function still in beta 😣"
                    trigger="click"
                  >
                    <div className="forget">
                      <a>Forgot password ?</a>
                    </div>
                  </Tooltip>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      loading={editMutation.isPending}
                    >
                      LogIn
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default Login;
