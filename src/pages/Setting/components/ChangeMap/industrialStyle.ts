import { Button, Modal, Table } from "antd";
import styled from "styled-components";

// MapManager 與其子元件共用的工業風元件
export const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;

  &.ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.upload-btn {
    background: #52c41a;
    border-color: #52c41a;
    color: #ffffff;

    &:hover {
      background: #73d13d;
      border-color: #73d13d;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.4);
    }
  }

  &.view-btn {
    background: #ffffff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #f0f5ff;
      border-color: #40a9ff;
      color: #40a9ff;
    }
  }

  &.edit-btn {
    background: #ffffff;
    border: 1px solid #faad14;
    color: #faad14;

    &:hover {
      background: #fffbe6;
      border-color: #faad14;
      color: #fa8c16;
    }
  }

  &.delete-btn {
    background: #ffffff;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
    }
  }
`;

export const IndustrialTable = styled(Table)`
  .ant-table {
    border: 1px solid #d9d9d9;
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    padding: 12px 16px;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: #f0f5ff;

      &::before {
        width: 4px;
      }

      td {
        background: transparent;
      }
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    padding: 12px 16px;
    font-size: 12px;
  }
`;

export const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #1890ff;
    padding: 16px 24px;
    border-radius: 0;
  }

  .ant-modal-title {
    color: #1890ff;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-footer {
    border-top: 1px solid #d9d9d9;
    padding: 16px 24px;

    .ant-btn {
      font-family: "Roboto Mono", monospace;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      height: 36px;
      font-weight: 600;
      border-radius: 0;
    }
  }
`;
