import {
  Button,
  Flex,
  Form,
  InputNumber,
  message,
  Modal,
  Select,
  Tooltip,
} from "antd";
import {
  RedoOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { FC, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import useOneTaskDetailFork from "@/api/useOneTaskDetailFork";
import useTaskOptions from "./hook/useTaskOptions";
import { Action_Type, Select_Location_Type } from "./types";
import { controlList } from "./params";
import DynamicControlFields from "./DynamicControlFields";

enum YawGenre {
  CUSTOM,
  SELECT,
  CALCULATE_BY_AGV_AND_SHELF_ANGLE,
}

// Industrial Style Components - Light Mode
const IndustrialContainer = styled.div`
  background: #f5f5f5;
  min-height: 100vh;
  padding: 20px;
  font-family: "Roboto Mono", "Courier New", monospace;
`;

const StatusBar = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Roboto Mono", monospace;
  color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const SectionHeader = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #fa8c16;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #fa8c16;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
`;

const IndustrialCard = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: #bfbfbf;
  }
`;

const ControlDisplay = styled.div<{ hasValue: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 350px;
  padding: ${({ hasValue }) => (hasValue ? "16px" : "20px")};
  background: ${({ hasValue }) => (hasValue ? "#f0f5ff" : "#fafafa")};
  border: 2px solid ${({ hasValue }) => (hasValue ? "#1890ff" : "#d9d9d9")};
  position: relative;
  font-family: "Roboto Mono", monospace;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ hasValue }) =>
      hasValue
        ? "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(24, 144, 255, 0.03) 2px, rgba(24, 144, 255, 0.03) 4px)"
        : "none"};
    pointer-events: none;
  }

  ${({ hasValue }) =>
    hasValue &&
    `box-shadow: inset 0 0 20px rgba(24, 144, 255, 0.08), 0 2px 8px rgba(24, 144, 255, 0.12);`}
`;

const EmptyStateText = styled.div`
  color: #8c8c8c;
  font-size: 13px;
  text-align: center;
  padding: 20px;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 2px;
  border: 1px dashed #d9d9d9;
  background: #fafafa;
`;

const ControlItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  transition: all 0.2s ease;
  position: relative;
  font-family: "Roboto Mono", monospace;

  &::after {
    content: "";
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(to bottom, transparent, #1890ff, transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover {
    background: #fafafa;
    border-left-color: #fa8c16;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    &::after {
      opacity: 1;
    }
  }
`;

const ControlLabel = styled.span`
  flex: 1;
  font-weight: 500;
  font-size: 13px;
  color: #262626;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ControlIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-size: 11px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  box-shadow: 0 1px 4px rgba(24, 144, 255, 0.15);
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.danger {
    border-color: #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;
    font-weight: 600;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &:disabled {
    background: #f5f5f5;
    border-color: #d9d9d9;
    color: #bfbfbf;
  }
`;

const ValidationPanel = styled.div<{ status: "success" | "warning" | "error" }>`
  background: #ffffff;
  border: 2px solid;
  border-color: ${({ status }) =>
    status === "success"
      ? "#52c41a"
      : status === "warning"
        ? "#faad14"
        : "#ff4d4f"};
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "Roboto Mono", monospace;
  color: ${({ status }) =>
    status === "success"
      ? "#52c41a"
      : status === "warning"
        ? "#faad14"
        : "#ff4d4f"};
  box-shadow: inset 0 0 20px
    ${({ status }) =>
      status === "success"
        ? "rgba(82, 196, 26, 0.08)"
        : status === "warning"
          ? "rgba(250, 173, 20, 0.08)"
          : "rgba(255, 77, 79, 0.08)"};
`;

const MetricDisplay = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #1890ff;

  .label {
    color: #8c8c8c;
    text-transform: uppercase;
    font-size: 10px;
  }

  .value {
    color: #1890ff;
    font-weight: 600;
  }
`;

const ActionButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;

  button {
    background: transparent;
    border: none;
    color: #8c8c8c;
    padding: 2px;
    height: 20px;
    width: 24px;

    &:hover:not(:disabled) {
      color: #1890ff;
    }

    &:disabled {
      color: #d9d9d9;
    }
  }
`;

const FieldLabel = styled.span`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

// Custom Industrial Segmented Control - Light Mode
const IndustrialSegmentedContainer = styled.div`
  display: flex;
  width: 100%;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  position: relative;
  overflow: hidden;
`;

const SegmentedOption = styled.button<{ isActive: boolean }>`
  flex: 1;
  padding: 10px 16px;
  background: ${({ isActive }) => (isActive ? "#ffffff" : "transparent")};
  border: none;
  border-right: 1px solid #d9d9d9;
  color: ${({ isActive }) => (isActive ? "#1890ff" : "#8c8c8c")};
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:last-child {
    border-right: none;
  }

  &:hover:not(:disabled) {
    background: #f0f5ff;
    color: ${({ isActive }) => (isActive ? "#1890ff" : "#40a9ff")};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${({ isActive }) =>
    isActive &&
    `
    &::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: #1890ff;
      box-shadow: 0 0 8px rgba(24, 144, 255, 0.5);
    }
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(to right, transparent, #1890ff, transparent);
    }
  `}
`;

interface IndustrialSegmentedProps {
  options: Array<{ label: string; value: string | number }>;
  value?: string | number;
  onChange?: (value: any) => void;
  disabled?: boolean;
}

const IndustrialSegmented: React.FC<IndustrialSegmentedProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <IndustrialSegmentedContainer>
      {options.map((option) => (
        <SegmentedOption
          key={option.value}
          isActive={value === option.value}
          onClick={() => onChange?.(option.value)}
          disabled={disabled}
          type="button"
        >
          {option.label}
        </SegmentedOption>
      ))}
    </IndustrialSegmentedContainer>
  );
};

const TaskFormFork: FC<{
  editTaskKey: string;
  selectedMissionCar: string;
  selectedMissionKey: string;
}> = ({ editTaskKey, selectedMissionKey }) => {
  const { data: originFormData } = useOneTaskDetailFork(editTaskKey);
  const [actionState, setActionStatus] = useState<Action_Type>("move");
  const [messageApi, contextHolder] = message.useMessage();
  const [isSpecialAction, setIsSpecialAction] = useState(false);
  const [controlClickOrder, setControlClickOrder] = useState<string[]>([]);
  const [selectLocationType, setSelectLocationType] =
    useState<Select_Location_Type>("custom");
  const [selectLevelType, setSelectLevelType] = useState<"custom" | "select">(
    "custom"
  );
  const [selectYaw, setSelectYaw] = useState<YawGenre>();
  const [submittable, setSubmittable] = useState<boolean>(false);
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);

  const {
    locationsOption,
    NormalActionListOptions,
    SpecialActionListOptions,
    SelectLocationOptions,
    SelectLevelOptions,
    SelectYawOptions,
  } = useTaskOptions(actionState as Action_Type);

  const deleteControlElementFromIndex = (index: number) => {
    setControlClickOrder((prev) => {
      const newOrder = prev.filter((_, i) => i !== index);
      setTimeout(() => {
        const currentForkValues = form.getFieldValue(["io", "fork"]) || {};
        const newForkValues = {};
        let newIndex = 0;
        Object.keys(currentForkValues).forEach((key, oldIndex) => {
          if (oldIndex !== index) {
            newForkValues[newIndex.toString()] = currentForkValues[key];
            newIndex++;
          }
        });
        form.setFieldValue(["io", "fork"], newForkValues);
      }, 0);
      return newOrder;
    });
  };

  const handleControlClick = (movement: string) => {
    setControlClickOrder((prev) => [...prev, movement]);
  };

  const moveControlIndex = (from: number, to: number) => {
    setControlClickOrder((prev) => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(from, 1);
      newOrder.splice(to, 0, moved);
      const current = form.getFieldValue(["io", "fork"]) || {};
      const keys = Object.keys(current);
      const reorderedForkValues = {};
      const reorderedKeys = [...keys];
      const [removedKey] = reorderedKeys.splice(from, 1);
      reorderedKeys.splice(to, 0, removedKey);
      reorderedKeys.forEach((oldKey, newIndex) => {
        reorderedForkValues[newIndex] = current[oldKey];
      });
      setTimeout(() => {
        form.setFieldValue(["io", "fork"], reorderedForkValues);
      }, 0);
      return newOrder;
    });
  };

  const editMutation = useMutation({
    mutationFn: (payload) => {
      return client.post("api/setting/update-task-fork", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const onFinish = () => {
    const payload = form.getFieldsValue();
    if (controlClickOrder.length === 0) {
      messageApi.warning(t("mission.task_table.control_warn"));
      return;
    }
    const newPayload = {
      ...payload,
      is_define_id: selectLocationType,
      action_type: actionState,
      control: controlClickOrder,
      id: editTaskKey,
      is_define_yaw: selectYaw,
      missionTitleId: selectedMissionKey,
    };
    editMutation.mutate(newPayload);
  };

  const changeActiontype = (e: Action_Type) => {
    setControlClickOrder([]);
    setActionStatus(e);
    form.setFieldValue("locationId", 0);
    form.setFieldValue(["io", "fork"], {});
  };

  const canSelectIsDefinedId = () => {
    const excludedActions = [
      "spin",
      "fork",
      "charge",
      "cargo_limit",
      "verity_cargo",
    ];
    return !excludedActions.includes(actionState);
  };

  const getValidationStatus = useMemo(() => {
    if (submittable) {
      return {
        status: "success" as const,
        message: "[OK] CONFIGURATION VALID",
        icon: <CheckCircleOutlined />,
      };
    }
    if (controlClickOrder.length === 0) {
      return {
        status: "warning" as const,
        message: "[WARN] NO CONTROL SEQUENCE DEFINED",
        icon: <WarningOutlined />,
      };
    }
    const needsLocation = canSelectIsDefinedId();
    if (
      needsLocation &&
      selectLocationType === "custom" &&
      !values?.locationId
    ) {
      return {
        status: "error" as const,
        message: "[ERROR] LOCATION REQUIRED",
        icon: <WarningOutlined />,
      };
    }
    return {
      status: "warning" as const,
      message: "[WARN] INCOMPLETE CONFIGURATION",
      icon: <WarningOutlined />,
    };
  }, [submittable, controlClickOrder, selectLocationType, values]);

  useEffect(() => {
    if (originFormData) {
      setActionStatus(originFormData.operation.type as any);
      setSelectLocationType(
        (originFormData.operation.is_define_id as Select_Location_Type) ||
          "custom"
      );
      setSelectLevelType(
        (originFormData.io.fork_global?.is_define_level as
          | "select"
          | "custom") || "custom"
      );
      setSelectYaw(originFormData.operation.is_define_yaw as YawGenre);
      setControlClickOrder(originFormData.operation.control || []);
      form.setFieldsValue({
        action_type: originFormData.operation.type,
        locationId: originFormData.operation.locationId?.toString(),
        is_define_yaw: originFormData.operation.is_define_yaw,
        yaw: originFormData.operation.yaw,
        tolerance: originFormData.operation.tolerance,
        lookahead: originFormData.operation.lookahead,
        io: originFormData.io,

        is_define_id: originFormData.operation.is_define_id,
        is_define_level:
          originFormData.io.fork_global?.is_define_level || "custom",
        level: (originFormData.io.fork_global?.level + 1) | 0,
      });
    }
  }, [originFormData, form]);

  useEffect(() => {
    if (controlClickOrder.length === 0) {
      setSubmittable(false);
      return;
    }
    const value = form.getFieldsValue();
    if (
      selectLocationType === "custom" &&
      !value.locationId &&
      canSelectIsDefinedId()
    ) {
      setSubmittable(false);
      return;
    }
    setSubmittable(true);
  }, [form, values, controlClickOrder, selectLocationType]);

  return (
    <IndustrialContainer>
      {contextHolder}

      {/* Status Bar */}
      <StatusBar>
        <Flex align="center" gap="middle">
          <ToolOutlined style={{ fontSize: 16 }} />
          <span style={{ fontWeight: 600 }}>
            {t("mission.task_form_fork.system_title")}
          </span>
          <MetricDisplay>
            <span className="label">
              {t("mission.task_form_fork.task_id")}:
            </span>
            <span className="value">{editTaskKey || "N/A"}</span>
          </MetricDisplay>
        </Flex>
        <Flex gap="middle">
          <MetricDisplay>
            <span className="label">{t("mission.task_form_fork.status")}:</span>
            <span className="value">
              {submittable
                ? t("mission.task_form_fork.ready")
                : t("mission.task_form_fork.config")}
            </span>
          </MetricDisplay>
          <MetricDisplay>
            <span className="label">{t("mission.task_form_fork.steps")}:</span>
            <span className="value">{controlClickOrder.length}</span>
          </MetricDisplay>
        </Flex>
      </StatusBar>

      {/* Validation Panel */}
      <ValidationPanel status={getValidationStatus.status}>
        {getValidationStatus.icon}
        <span style={{ fontWeight: 600, letterSpacing: 1 }}>
          {getValidationStatus.message}
        </span>
      </ValidationPanel>

      <Form
        form={form}
        autoComplete="off"
        size="large"
        variant="outlined"
        onFinish={onFinish}
        layout="vertical"
      >
        {/* Action Type Selection */}
        <IndustrialCard>
          <SectionHeader>
            <SettingOutlined />
            [01] {t("mission.task_form_fork.action_type")}
          </SectionHeader>
          <Flex gap="middle" justify="space-between" align="center" wrap="wrap">
            <Form.Item
              label={
                <FieldLabel>
                  {t("mission.task_form_fork.select_action")}
                </FieldLabel>
              }
              name="action_type"
              style={{ flex: 1, minWidth: 300, marginBottom: 0 }}
            >
              <IndustrialSegmented
                onChange={(e: Action_Type) => changeActiontype(e)}
                options={
                  isSpecialAction
                    ? SpecialActionListOptions
                    : NormalActionListOptions
                }
              />
            </Form.Item>
            <Tooltip
              title={
                isSpecialAction
                  ? t("mission.task_form_fork.switch_to_normal")
                  : t("mission.task_form_fork.switch_to_special")
              }
            >
              <IndustrialButton
                onClick={() => setIsSpecialAction(!isSpecialAction)}
              >
                {isSpecialAction
                  ? t("mission.task_form_fork.normal")
                  : t("mission.task_form_fork.special")}
              </IndustrialButton>
            </Tooltip>
          </Flex>
        </IndustrialCard>

        {/* Control Sequence Builder */}
        <IndustrialCard>
          <SectionHeader>
            <ToolOutlined />
            [02] {t("mission.task_form_fork.control_sequence")}
          </SectionHeader>

          <Flex align="flex-start" gap="middle" style={{ marginBottom: 20 }}>
            <ControlDisplay hasValue={controlClickOrder.length > 0}>
              {controlClickOrder.length > 0 ? (
                <Flex
                  vertical
                  gap="6px"
                  style={{ width: "100%", position: "relative", zIndex: 1 }}
                >
                  {controlClickOrder.map((ctrl, idx) => (
                    <ControlItem key={idx}>
                      <ControlIndex>#{idx + 1}</ControlIndex>
                      <ControlLabel>{ctrl}</ControlLabel>

                      <ActionButtonGroup>
                        <Tooltip title={t("mission.task_form_fork.move_up")}>
                          <Button
                            type="text"
                            size="small"
                            disabled={idx === 0}
                            icon={<ArrowUpOutlined />}
                            onClick={() => moveControlIndex(idx, idx - 1)}
                          />
                        </Tooltip>
                        <Tooltip title={t("mission.task_form_fork.move_down")}>
                          <Button
                            type="text"
                            size="small"
                            disabled={idx === controlClickOrder.length - 1}
                            icon={<ArrowDownOutlined />}
                            onClick={() => moveControlIndex(idx, idx + 1)}
                          />
                        </Tooltip>
                      </ActionButtonGroup>

                      <Tooltip title={t("mission.task_form_fork.delete")}>
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => deleteControlElementFromIndex(idx)}
                          style={{ color: "#ff4444" }}
                        />
                      </Tooltip>
                    </ControlItem>
                  ))}
                </Flex>
              ) : (
                <EmptyStateText>
                  [{" "}
                  {t("mission.task_form_fork.no_control_sequence") ||
                    "No control sequence selected"}{" "}
                  ]
                </EmptyStateText>
              )}
            </ControlDisplay>

            <Tooltip title={t("mission.task_form_fork.reset_all")}>
              <IndustrialButton
                className={controlClickOrder.length > 0 ? "danger" : ""}
                icon={<RedoOutlined />}
                onClick={() => {
                  setControlClickOrder([]);
                  form.setFieldValue(["io", "fork"], {});
                }}
                style={{ height: 40, width: 40 }}
              />
            </Tooltip>
          </Flex>

          {/* Control Buttons */}
          {controlList[actionState]?.length > 0 && (
            <div>
              <div
                style={{
                  color: "#666",
                  fontSize: 10,
                  textTransform: "uppercase",
                  marginBottom: 8,
                  letterSpacing: 1,
                }}
              >
                {t("mission.task_form_fork.available_controls")}:
              </div>
              <Flex wrap gap="small">
                {(controlList[actionState] || []).map((movement) => (
                  <IndustrialButton
                    key={movement}
                    onClick={() => handleControlClick(movement)}
                  >
                    {movement}
                  </IndustrialButton>
                ))}
              </Flex>
            </div>
          )}
        </IndustrialCard>

        {/* Dynamic Control Configuration */}
        <IndustrialCard>
          <SectionHeader>
            <SettingOutlined />
            [03] {t("mission.task_form_fork.control_params")}
          </SectionHeader>
          <DynamicControlFields
            controlSequence={controlClickOrder}
            form={form}
            locationsOption={locationsOption}
          />
        </IndustrialCard>

        {/* Location Settings */}
        {canSelectIsDefinedId() && (
          <IndustrialCard>
            <SectionHeader>
              <SettingOutlined />
              [04] {t("mission.task_form_fork.location_config")}
            </SectionHeader>
            <Form.Item
              label={
                <FieldLabel>
                  {t("mission.task_form_fork.select_location_type")}
                </FieldLabel>
              }
              name="is_define_id"
            >
              <Select
                value={selectLocationType}
                onChange={(e: Select_Location_Type) => setSelectLocationType(e)}
                options={SelectLocationOptions}
                style={{ width: "100%" }}
              />
            </Form.Item>

            {selectLocationType === "custom" && (
              <Form.Item
                label={
                  <FieldLabel>
                    {t("mission.task_form_fork.target_location")}
                  </FieldLabel>
                }
                name="locationId"
                rules={[
                  {
                    required: true,
                    message: t("mission.task_table.location_required"),
                  },
                ]}
              >
                <Select
                  showSearch
                  style={{ width: "100%" }}
                  options={locationsOption}
                />
              </Form.Item>
            )}
          </IndustrialCard>
        )}

        {/* Yaw Configuration for Spin */}
        {actionState === "spin" && (
          <IndustrialCard>
            <SectionHeader>
              <SettingOutlined />
              [05] {t("mission.task_form_fork.yaw_config")}
            </SectionHeader>
            <Form.Item
              label={
                <FieldLabel>
                  {t("mission.task_form_fork.select_yaw_type")}
                </FieldLabel>
              }
              name="is_define_yaw"
            >
              <IndustrialSegmented
                value={selectYaw}
                onChange={(e: YawGenre) => setSelectYaw(e)}
                options={SelectYawOptions}
              />
            </Form.Item>

            {selectYaw === YawGenre.CUSTOM && (
              <Form.Item
                label={
                  <FieldLabel>
                    {t("mission.task_form_fork.yaw_angle")}
                  </FieldLabel>
                }
                name="yaw"
                rules={[
                  {
                    required: true,
                    message: t("mission.task_table.yaw_required"),
                  },
                  {
                    type: "number",
                    min: -180,
                    max: 180,
                    message: t("mission.task_table.yaw_range"),
                  },
                ]}
              >
                <InputNumber
                  min={-180}
                  max={180}
                  addonAfter="°"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            )}
          </IndustrialCard>
        )}

        {/* Level Configuration */}
        {(actionState === "load" || actionState === "offload") && (
          <IndustrialCard>
            <SectionHeader>
              <SettingOutlined />
              [05] {t("mission.task_form_fork.level_config")}
            </SectionHeader>
            <Form.Item
              label={
                <FieldLabel>
                  {t("mission.task_form_fork.select_level_type")}
                </FieldLabel>
              }
              name="is_define_level"
            >
              <Select
                value={selectLevelType}
                onChange={(e: "select" | "custom") => setSelectLevelType(e)}
                options={SelectLevelOptions}
                style={{ width: "100%" }}
              />
            </Form.Item>

            {selectLevelType === "custom" && (
              <Form.Item
                label={
                  <FieldLabel>{t("mission.task_form_fork.level")}</FieldLabel>
                }
                name="level"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            )}
          </IndustrialCard>
        )}

        {/* Wait Configuration */}
        {controlClickOrder.some((item) => item.startsWith("W")) && (
          <IndustrialCard>
            <SectionHeader>
              <SettingOutlined />
              [06] {t("mission.task_form_fork.wait_config")}
            </SectionHeader>
            <Form.Item
              label={
                <FieldLabel>{t("mission.task_form_fork.wait_time")}</FieldLabel>
              }
              name="wait"
            >
              <InputNumber
                min={1}
                placeholder="1"
                addonAfter="s"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </IndustrialCard>
        )}

        {/* Submit Section */}
        <Flex
          align="center"
          justify="center"
          gap="middle"
          style={{ padding: "40px 0 20px" }}
        >
          <IndustrialButton
            className="primary"
            size="large"
            htmlType="submit"
            disabled={!submittable}
            loading={editMutation.isPending}
            style={{ minWidth: 160 }}
          >
            {editMutation.isPending
              ? t("mission.task_form_fork.saving")
              : t("mission.task_form_fork.deploy")}
          </IndustrialButton>
        </Flex>
      </Form>
    </IndustrialContainer>
  );
};

export default TaskFormFork;
