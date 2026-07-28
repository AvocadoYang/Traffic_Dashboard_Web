import {
  Alert,
  Button,
  Flex,
  Form,
  FormInstance,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Tooltip,
} from "antd";
import React, { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
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
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import {
  Mir_Action_Type,
  Mir_All_Action,
  Mir_Move_Action_Type,
  Mir_Sound_light_type,
  Mir_Task,
  mirMoveActonList,
  mirSoundLight,
} from "./type";
import useMirTaskOptions from "./useMirTaskOptions";

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

// 1. 大類別選項 (用來傳給 IndustrialSegmented)
const taskCategoryOptions = [
  { label: "Move", value: "move" },
  { label: "Sound/Light", value: "sound/light" },
];

// 2. 移動相關 Action 選項
const moveActionOptions = mirMoveActonList.map((e) => ({
  value: e,
  label: e,
}));

// 3. 聲光相關 Action 選項
const SLActionOptions = mirSoundLight.map((e) => ({
  value: e,
  label: e,
}));

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

const TaskFormMir: FC<{
  editTaskKey: string;
  selectedMissionCar: string;
  selectedMissionKey: string;
  form: FormInstance<any>;
}> = ({ editTaskKey, selectedMissionKey, form }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  // 1. 當前選中的任務大類別 ('move' | 'sound/light')
  const [taskType, setTaskType] = useState<Mir_Task>("move");
  const [taskAction, setTaskAction] = useState<Mir_All_Action>();

  const {locationsOption} =useMirTaskOptions()


  // 2. 切換大類別的 Handle 函式
  const handleCategoryChange = (newType: Mir_Task) => {
    setTaskType(newType);
    setTaskAction(undefined);
    // 重設或更新 Form 內部 action 的值 (避免切換類別後殘留舊類別的選項)
    form.setFieldsValue({ action_type: undefined });
  };

  const handleAction = (v: Mir_All_Action) => {
    setTaskAction(v);
  };

  // 3. 根據 taskType 動態回傳子選項列表 (給 Select 下拉選單用)
  const getSubActionOptions = () => {
    switch (taskType) {
      case "move":
        return moveActionOptions;
      case "sound/light":
        return SLActionOptions;
      default:
        return [];
    }
  };

  return (
    <IndustrialContainer>
      {contextHolder}

      {/* ... StatusBar 保持不變 ... */}

      <Form
        form={form}
        autoComplete="off"
        size="large"
        variant="outlined"
        // onFinish={onFinish}
        layout="vertical"
      >
        {/* Action Type Selection */}
        <IndustrialCard>
          <SectionHeader>
            <SettingOutlined />
            [01] {t("mission.task_form_fork.action_type")}
          </SectionHeader>

          <Flex vertical>
            {/* 🎯 1. 大類別分頁切換 (Segmented) */}
            <Form.Item label={<FieldLabel>Task Category</FieldLabel>}>
              <IndustrialSegmented
                value={taskType} // 👈 記得傳入當前的 value 才會 rerender 高亮
                onChange={(val: Mir_Task) => handleCategoryChange(val)}
                options={taskCategoryOptions} // 👈 傳入 Move / Sound/Light
              />
            </Form.Item>

            {/* 🎯 2. 根據類別動態渲染對應的 Action 下拉選單 (Select) */}
            <Form.Item
              label={
                <FieldLabel>
                  {t("mission.task_form_fork.select_action")}
                </FieldLabel>
              }
              name="action_type" // 👈 真正要儲存進 Form 的欄位
              rules={[{ required: true, message: "Please select an action" }]}
              style={{ flex: 1, minWidth: 300, marginBottom: 0 }}
            >
              <Select
                placeholder="Select an action"
                options={getSubActionOptions()}
                onChange={(e) => handleAction(e)}
              />
            </Form.Item>
          </Flex>
        </IndustrialCard>
        {taskAction}

        {taskAction === "Docking" && (
          <IndustrialCard>
            <SectionHeader>
              <ToolOutlined />
              [02] Docking
            </SectionHeader>
            <Form.Item
              label={<FieldLabel>選擇類別</FieldLabel>}
              name="docking.locationId"
            >
              <Select
                options={locationsOption}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </IndustrialCard>
        )}
      </Form>
    </IndustrialContainer>
  );
};

export default TaskFormMir;
