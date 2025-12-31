import React, { FC, useMemo } from "react";
import styled from "styled-components";
import { Form, message, Modal, Select } from "antd";
import { useMutation } from "@tanstack/react-query";
import {
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useMap from "@/api/useMap";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

// Industrial Styled Components
const StyledModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 0;
    overflow: hidden;
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    padding: 16px 20px;
    margin-bottom: 0;
  }

  .ant-modal-title {
    font-family: "Roboto Mono", monospace;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1890ff;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ant-modal-body {
    padding: 24px 20px;
    background: #ffffff;
  }

  .ant-modal-footer {
    background: #fafafa;
    border-top: 2px solid #d9d9d9;
    padding: 12px 20px;
    margin-top: 0;

    .ant-btn {
      font-family: "Roboto Mono", monospace;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      height: 36px;
      border: 1px solid #d9d9d9;
      min-width: 100px;

      &.ant-btn-default {
        background: #ffffff;
        color: #595959;

        &:hover {
          background: #fafafa;
          border-color: #8c8c8c;
          color: #262626;
        }
      }

      &.ant-btn-primary {
        background: #1890ff;
        border-color: #1890ff;
        color: #ffffff;
        font-weight: 600;

        &:hover {
          background: #40a9ff;
          border-color: #40a9ff;
        }

        &:disabled {
          background: #f5f5f5;
          border-color: #d9d9d9;
          color: #bfbfbf;
        }
      }
    }
  }

  .ant-modal-close {
    color: #8c8c8c;

    &:hover {
      color: #ff4d4f;
      background: #fff1f0;
    }
  }
`;

const IndustrialFormContainer = styled.div`
  font-family: "Roboto Mono", monospace;

  .ant-form-item {
    margin-bottom: 0;
  }

  .ant-form-item-label {
    padding-bottom: 8px;

    > label {
      font-family: "Roboto Mono", monospace;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #595959;
      height: auto;

      &::after {
        display: none;
      }
    }
  }

  .ant-select {
    font-family: "Roboto Mono", monospace;

    .ant-select-selector {
      background: #fafafa;
      border: 2px solid #d9d9d9 !important;
      height: 40px !important;
      padding: 4px 12px !important;
      font-family: "Roboto Mono", monospace;
      transition: all 0.2s ease;

      &:hover {
        border-color: #1890ff !important;
        background: #ffffff;
      }

      .ant-select-selection-search-input {
        height: 32px !important;
        font-family: "Roboto Mono", monospace;
      }

      .ant-select-selection-item,
      .ant-select-selection-placeholder {
        line-height: 32px !important;
        font-family: "Roboto Mono", monospace;
        font-size: 12px;
        color: #262626;
      }

      .ant-select-selection-placeholder {
        color: #8c8c8c;
      }
    }

    &.ant-select-focused .ant-select-selector {
      border-color: #1890ff !important;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1) !important;
      background: #ffffff;
    }
  }
`;

const InstructionPanel = styled.div`
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-left: 3px solid #1890ff;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  color: #262626;
  line-height: 1.7;

  .instruction-title {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1890ff;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .instruction-text {
    color: #595959;
    margin-bottom: 6px;
  }

  .instruction-list {
    margin-top: 8px;
    padding-left: 16px;

    li {
      color: #595959;
      margin-bottom: 4px;
      position: relative;

      &::marker {
        color: #1890ff;
      }
    }
  }

  .warning-note {
    margin-top: 10px;
    padding: 8px 10px;
    background: #fff7e6;
    border: 1px solid #ffd591;
    border-left: 2px solid #faad14;
    color: #ad6800;
    font-size: 10px;
    display: flex;
    align-items: flex-start;
    gap: 6px;

    .warning-icon {
      color: #faad14;
      font-size: 12px;
      margin-top: 1px;
    }
  }
`;

const LocationIcon = styled(EnvironmentOutlined)`
  font-size: 18px;
  color: #1890ff;
`;

interface StartPointProps {
  setOpenStartPoint: React.Dispatch<React.SetStateAction<boolean>>;
  openStartPoint: boolean;
}

const StartPoint: FC<StartPointProps> = ({
  openStartPoint,
  setOpenStartPoint,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();
  const [form] = Form.useForm();
  const { data: mapData } = useMap();

  const locationsOption = useMemo(() => {
    return (
      mapData?.locations.map((v) => ({
        label: v.locationId,
        value: v.locationId,
      })) || []
    );
  }, [mapData]);

  const sMutation = useMutation({
    mutationFn: (locationId: string) => {
      return client.post("/api/setting/set-initial-point", { locationId });
    },
    onSuccess: () => {
      messageApi.success(t("start_point.success"));
      setOpenStartPoint(false);
      form.resetFields();
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const handleClose = () => {
    setOpenStartPoint(false);
    form.resetFields();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        sMutation.mutate(values.locationId);
      })
      .catch(() => {
        messageApi.warning(t("start_point.select_error"));
      });
  };

  return (
    <>
      {contextHolders}
      <StyledModal
        open={openStartPoint}
        onCancel={handleClose}
        onOk={handleOk}
        title={
          <>
            <LocationIcon />
            {t("start_point.title")}
          </>
        }
        okText={t("start_point.confirm")}
        cancelText={t("start_point.cancel")}
        confirmLoading={sMutation.isPending}
        width={520}
      >
        <IndustrialFormContainer>
          <InstructionPanel>
            <div className="instruction-title">
              <CheckCircleOutlined />
              {t("start_point.configuration_required")}
            </div>
            <div className="instruction-text">
              {t("start_point.description")}
            </div>
            <ul className="instruction-list">
              <li>
                <strong>{t("start_point.path_optimization")}</strong>
              </li>
              <li>
                <strong>{t("start_point.route_planning")}</strong>
              </li>
            </ul>
            <div className="warning-note">
              <WarningOutlined className="warning-icon" />
              <span>
                <strong>{t("start_point.critical_warning")}</strong>
              </span>
            </div>
          </InstructionPanel>

          <Form form={form} layout="vertical">
            <Form.Item
              label={t("start_point.location_id")}
              name="locationId"
              rules={[
                {
                  required: true,
                  message: t("start_point.select_error"),
                },
              ]}
            >
              <Select
                placeholder={t("start_point.select_location")}
                options={locationsOption}
                showSearch={{
                  filterOption: (input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase()),
                }}
                notFoundContent={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      fontFamily: '"Roboto Mono", monospace',
                      fontSize: "11px",
                      color: "#8c8c8c",
                      textTransform: "uppercase",
                    }}
                  >
                    {t("start_point.no_locations")}
                  </div>
                }
              />
            </Form.Item>
          </Form>
        </IndustrialFormContainer>
      </StyledModal>
    </>
  );
};

export default StartPoint;
