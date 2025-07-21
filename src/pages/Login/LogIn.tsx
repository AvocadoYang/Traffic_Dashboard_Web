import React from 'react';
import './login.css';
import { Col, Row } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, UserOutlined } from '@ant-design/icons';
import { Button, Input, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
const Login: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="background">
      <p style={{ position: 'fixed', right: '10px', bottom: '1px' }}>version: 1.0.0</p>
      <Row>
        <Col span={12}></Col>
        <Col span={12}>
          <div className="From-Wrap">
            <div className="Tittle"></div>
            <div className="wrapper">
              <h1>LogIn</h1>
              <Space direction="vertical" style={{ width: '80%' }}>
                <Input
                  placeholder="User ID"
                  prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                />
                <Input.Password
                  placeholder="input password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Space>

              <div className="forget">
                <a href="#">Forgot password ?</a>
              </div>

              <Button
                size="large"
                onClick={() => {
                  navigate('/Setting');
                }}
              >
                LogIn
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
