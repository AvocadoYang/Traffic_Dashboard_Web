import { Button, Flex, Form, FormInstance, message, Select } from "antd";
import React, { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { ToolOutlined, SettingOutlined } from "@ant-design/icons";
import {
  Mir_Action,
  Mir_All_Action,
  Mir_Task,
  mirErrorHandlingList,
  mirMoveActonList,
  mirSaftySystemList,
  mirSoundLight,
} from "./type";
import {
  MirBlockedDockingTimeoutInputInput,
  MirBlockedPathTimeoutInputInput,
  MirCollisionDetectionInput,
  MirDistanceThresholdInput,
  MirFootprintInput,
  MirFrontInput,
  MirLocationInput,
  MirMaximumAngularSpeedInputInput,
  MirMaximumLinearSpeedInputInput,
  MirOrientationInput,
  MirRearInput,
  MirSideInput,
  MirSoundInput,
  MirSwitchMapInput,
  MirVolumeInput,
  MirWaitInput,
  MirXInput,
  MirYInput,
} from "./FormInputs";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import client from "@/api/axiosClient";
import { useAtomValue } from "jotai";
import { currentMapIdAtom } from "@/utils/mapSelection";
import useTaskMir from "@/api/useTaskMir";
import useTaskMirOne from "@/api/useTaskMirOne";

const IndustrialContainer = styled.div`
  background: #f5f5f5;
  min-height: 100vh;
  padding: 20px;
  font-family: "Roboto Mono", "Courier New", monospace;
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
  { label: "Error Handling", value: "Error Handling" },
  { label: "Safty system", value: "Safty system" },
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

const errorhandlingActionOptions = mirErrorHandlingList.map((e) => ({
  value: e,
  label: e,
}));

const saftySystemActionOptions = mirSaftySystemList.map((e) => ({
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
  const queryClient = useQueryClient();
  // 1. 當前選中的任務大類別 ('move' | 'sound/light')
  const [taskType, setTaskType] = useState<Mir_Task>("move");
  const [taskAction, setTaskAction] = useState<Mir_All_Action>();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const { data: taskDataSource } = useTaskMirOne(editTaskKey);

  useEffect(() => {
    if (!taskDataSource) return;

    const op = taskDataSource || (taskDataSource as any);
    const actionType = (op.type || taskDataSource.type) as Mir_All_Action;
    console.log(op);
    console.log(actionType);

    if (mirMoveActonList.includes(actionType as any)) {
      setTaskType("move");
    } else if (mirSoundLight.includes(actionType as any)) {
      setTaskType("sound/light");
    } else if (mirErrorHandlingList.includes(actionType as any)) {
      setTaskType("Error Handling");
    } else if (mirSaftySystemList.includes(actionType as any)) {
      setTaskType("Safty system");
    }

    setTaskAction(actionType);

    const formattedWait = op.wait
      ? dayjs(op.wait, "HH:mm:ss").isValid()
        ? dayjs(op.wait, "HH:mm:ss")
        : undefined
      : undefined;

    setTimeout(() => {
      form.setFieldsValue({
        action_type: actionType,

        location_id: op.location_id,
        entry_position: op.entry_position,
        footprint: op.footprint,
        blocked_path_timeout: op.blocked_path_timeout ?? 60,
        blocked_docking_timeout: op.blocked_docking_timeout ?? 60,
        maximum_linear_speed: op.maximum_linear_speed ?? 0.25,
        maximum_angular_speed: op.maximum_angular_speed ?? 0.25,
        distance_threshold: op.distance_threshold ?? 0.25,
        x: op.x ?? 0,
        y: op.y ?? 0,
        orientation: op.orientation ?? 0,
        collision_detection: op.collision_detection ?? true,
        wait: formattedWait,
        sound: op.sound,
        volume: op.volume ?? 0,
        front: op.front ?? "unmuted",
        rear: op.rear ?? "unmuted",
        sides: op.sides ?? "unmuted",
      });
    }, 0);
  }, [taskDataSource, form]);



  // 2. 切換大類別的 Handle 函式
  const handleCategoryChange = (newType: Mir_Task) => {
    setTaskType(newType);
    setTaskAction(undefined);
    form.setFieldsValue({ action_type: undefined });
  };

  const handleAction = (v: Mir_All_Action) => {
    setTaskAction(v);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Mir_Action) => {
      return client.post("api/setting/save-edit-mir-task", payload);
    },
    onSuccess: async () => {
      setTimeout(async () => {
        void messageApi.success("success");
        await queryClient.refetchQueries({ queryKey: ["map"] });
      }, 500);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const getSubActionOptions = () => {
    switch (taskType) {
      case "move":
        return moveActionOptions;
      case "sound/light":
        return SLActionOptions;
      case "Error Handling":
        return errorhandlingActionOptions;
      case "Safty system":
        return saftySystemActionOptions;
      default:
        return [];
    }
  };

  const onFinish = () => {
    const rawPayload = form.getFieldsValue();
    const newPayload = {
      missionTitleId: selectedMissionKey,
      currentMapId: currentMapId,
      id: editTaskKey,
      // 1. 基本動作類型
      type: rawPayload.action_type ?? "",

      // 2. 位置與導航相關
      location_id: rawPayload.location_id ?? "",
      entry_position: rawPayload.entry_position ?? "",
      footprint: rawPayload.footprint ?? "",

      // 3. 逾時與限制參數 (預設數值)
      blocked_path_timeout: rawPayload.blocked_path_timeout ?? 60,
      blocked_docking_timeout: rawPayload.blocked_docking_timeout ?? 60,
      maximum_linear_speed: rawPayload.maximum_linear_speed ?? 0.25,
      maximum_angular_speed: rawPayload.maximum_angular_speed ?? 0.25,
      distance_threshold: rawPayload.distance_threshold ?? 0.25,

      // 4. 相對位移參數
      x: rawPayload.x ?? 0,
      y: rawPayload.y ?? 0,
      orientation: rawPayload.orientation ?? 0,
      collision_detection: rawPayload.collision_detection ?? true,

      // 5. 時間與聲音相關
      wait:
        rawPayload.wait && dayjs(rawPayload.wait).isValid()
          ? dayjs(rawPayload.wait).format("HH:mm:ss")
          : "00:00:00",
      sound: rawPayload.sound ?? "",
      volume: rawPayload.volume ?? 0,

      // 6. 安全防護區域 (Mute/Unmute)
      front: rawPayload.front ?? "unmuted",
      rear: rawPayload.rear ?? "unmuted",
      sides: rawPayload.sides ?? "unmuted",
    };

    // alert(JSON.stringify(newPayload, null, 2));
    console.log("最終發送 Payload:", newPayload);
    saveMutation.mutate(newPayload);
  };

  return (
    <IndustrialContainer>
      {contextHolder}

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

        <SectionHeader>
          <ToolOutlined />
          {taskAction}
        </SectionHeader>

        {taskAction === "docking" && (
          <>
            <MirLocationInput />
            <MirBlockedPathTimeoutInputInput />
            <MirBlockedDockingTimeoutInputInput />
            <MirMaximumLinearSpeedInputInput />
          </>
        )}

        {taskAction === "move" && (
          <>
            <MirLocationInput />
            <MirBlockedPathTimeoutInputInput />
            <MirDistanceThresholdInput />
          </>
        )}

        {taskAction === "relative_move" && (
          <>
            <MirXInput />
            <MirYInput />
            <MirOrientationInput />
            <MirMaximumLinearSpeedInputInput />
            <MirMaximumAngularSpeedInputInput />
            <MirCollisionDetectionInput />
            <MirBlockedPathTimeoutInputInput />
          </>
        )}

        {taskAction === "set_footprint" && (
          <>
            <MirFootprintInput />
          </>
        )}

        {taskAction === "switch_map" && (
          <>
            <MirSwitchMapInput />
          </>
        )}

        {taskAction === "wait" && (
          <>
            <MirWaitInput />
          </>
        )}

        {taskAction === "reduce_protective_fields" && (
          <>
            <MirSoundInput />
            <MirVolumeInput />
            <MirFrontInput />
            <MirRearInput />
            <MirSideInput />
          </>
        )}

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
            style={{ minWidth: 160 }}
          >
            {t("mission.task_form_fork.deploy")}
          </IndustrialButton>
        </Flex>
      </Form>
    </IndustrialContainer>
  );
};

export default TaskFormMir;
