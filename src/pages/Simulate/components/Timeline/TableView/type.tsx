import { Modal } from "antd";
import styled from "styled-components";

export type Local_Table_Value = {
  id: string;
  time: string;
  type: string;
  detail: string;
};
export type Local_Range_Table_Value = {
  id: string;
  time: string;
  type: string;
  intervalTime: string;
  range: string;
  activeTimes: number;
  detail: string;
};
export const StyledCard = styled.div`
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
  transition: all 0.3s ease;
  min-height: 65vh;
  max-height: 65vh;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
`;

export const StyledModal = styled(Modal)`
  .ant-modal {
    top: 15px;
  }

  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }

  .ant-modal-header {
    background: #1890ff;
    border-bottom: 1px solid #d9d9d9;
    border-radius: 12px 12px 0 0;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #fff;
    font-size: 18px;
    font-weight: 500;
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-close-x {
    color: #fff;
    &:hover {
      color: #fff;
      opacity: 0.8;
    }
  }
`;
