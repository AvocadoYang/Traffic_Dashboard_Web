import { Form, Typography } from "antd";
import styled from "styled-components";
const { Title } = Typography;

export const StyledForm = styled(Form)`
  padding: 12px 4px;

  .ant-form-item-label > label {
    font-weight: 500;
    color: #4b5563;
  }

  .ant-form-item {
    margin-bottom: 18px;
  }

  .ant-input-number {
    width: 100%;
  }
`;

export const StyledTitle = styled(Title)`
  margin-bottom: 24px !important;
  color: #1677ff !important;
  text-align: center;
`;
