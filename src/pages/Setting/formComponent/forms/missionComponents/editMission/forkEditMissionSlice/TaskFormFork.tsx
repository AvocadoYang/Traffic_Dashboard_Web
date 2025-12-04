import {
  Button,
  Card,
  Flex,
  Form,
  InputNumber,
  message,
  Segmented,
  Select,
  Tooltip,
  Typography,
} from "antd";
import {
  QuestionCircleOutlined,
  RedoOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import useOneTaskDetailFork from "@/api/useOneTaskDetailFork";
import useTaskOptions from "./hook/useTaskOptions";
import {
  Action_Type,
  Select_Active_Robot_Type,
  Select_Location_Type,
} from "./types";
import { controlList } from "./params";
import DynamicControlFields from "./DynamicControlFields";

enum YawGenre {
  CUSTOM,
  SELECT,
  CALCULATE_BY_AGV_AND_SHELF_ANGLE,
}

const SectionHeader = styled(Typography.Title)`
  && {
    margin-bottom: 16px !important;
    font-size: 18px !important;
    color: #262626;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 8px;
  }
`;

const ControlDisplay = styled.div<{ hasValue: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 320px;
  padding: ${({ hasValue }) => (hasValue ? "16px" : "24px")};
  border-radius: 12px;
  background: ${({ hasValue }) =>
    hasValue
      ? "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.08) 100%)"
      : "rgba(250,250,250,0.8)"};
  border: 2px solid
    ${({ hasValue }) =>
      hasValue ? "rgba(59,130,246,0.3)" : "rgba(217,217,217,0.5)"};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ hasValue }) =>
    hasValue
      ? "0 4px 12px rgba(59,130,246,0.1)"
      : "0 2px 8px rgba(0,0,0,0.04)"};

  &:hover {
    border-color: ${({ hasValue }) =>
      hasValue ? "rgba(59,130,246,0.5)" : "rgba(217,217,217,0.8)"};
    box-shadow: ${({ hasValue }) =>
      hasValue
        ? "0 6px 16px rgba(59,130,246,0.15)"
        : "0 4px 12px rgba(0,0,0,0.06)"};
  }
`;

const EmptyStateText = styled.div`
  color: #8c8c8c;
  font-size: 14px;
  text-align: center;
  padding: 12px;
  font-style: italic;
`;

const ControlItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
  }
`;

const ControlLabel = styled.span`
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  color: #262626;
  font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace;
`;

const ControlIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
`;

const ActionButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

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
    robotOption,
    locationsOption,
    NormalActionListOptions,
    SpecialActionListOptions,
    SelectLocationOptions,
    SelectLevelOptions,
    SelectYawOptions,
    SelectActiveWaitRobotOptions,
    SelectWaitRobotOptions,
  } = useTaskOptions(actionState as Action_Type);

  const deleteControlElementFromIndex = (index: number) => {
    setControlClickOrder((prev) => {
      const newOrder = prev.filter((_, i) => i !== index);

      // Reorganize form fields to remove gaps
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

      // Reorder fork form fields as well
      const current = form.getFieldValue(["io", "fork"]) || {};
      const keys = Object.keys(current);

      // Old -> New mapping
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
    // Clear fork config when changing action type
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

  // Load initial data
  useEffect(() => {
    if (originFormData) {
      console.log(originFormData);
      setActionStatus(originFormData.operation.type as any);
      setSelectLocationType(
        (originFormData.operation.is_define_id as Select_Location_Type) ||
          "custom"
      );
      setSelectLevelType(
        (originFormData.io.fork_global.is_define_level as
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
        active_wait_amr:
          originFormData.operation.waitGenre !== null ? "enable" : "disable",
        waitOtherAmr: originFormData.operation.waitOtherAmr,
        wait_genre: originFormData.operation.waitGenre,
        tolerance: originFormData.operation.tolerance,
        lookahead: originFormData.operation.lookahead,
        io: originFormData.io,
      });
    }
  }, [originFormData, form]);

  // Form validation
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
  }, [form, values, controlClickOrder]);

  return (
    <>
      {contextHolder}
      <Form
        form={form}
        autoComplete="off"
        size="large"
        variant="outlined"
        onFinish={onFinish}
        layout="vertical"
      >
        {/* Action Type Selection Section */}
        <Card style={{ marginBottom: 24 }}>
          <SectionHeader level={4}>
            {t("mission.task_table_human_robot.action")} & Sequence
          </SectionHeader>
          <Flex gap="large" justify="space-between" align="center" wrap="wrap">
            <Form.Item
              label={t("mission.task_table_human_robot.action")}
              name="action_type"
              style={{ flex: 1, minWidth: 300 }}
            >
              <Segmented
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
                  ? t("mission.task_table.normal")
                  : t("mission.task_table.special")
              }
            >
              <Button
                type={isSpecialAction ? "primary" : "default"}
                onClick={() => setIsSpecialAction(!isSpecialAction)}
              >
                {isSpecialAction ? "N" : "S"}
              </Button>
            </Tooltip>
          </Flex>

          {/* Control Sequence Display */}

          <Flex
            align="center"
            gap="small"
            style={{ marginTop: 16, marginBottom: 16 }}
          >
            <ControlDisplay hasValue={controlClickOrder.length > 0}>
              {controlClickOrder.length > 0 ? (
                <Flex vertical gap="10px" style={{ width: "100%" }}>
                  {controlClickOrder.map((ctrl, idx) => (
                    <ControlItem key={idx}>
                      <ControlIndex>{idx + 1}</ControlIndex>
                      <ControlLabel>{ctrl}</ControlLabel>

                      <ActionButtonGroup>
                        <Tooltip title="Move Up">
                          <Button
                            type="text"
                            size="small"
                            disabled={idx === 0}
                            icon={<ArrowUpOutlined />}
                            onClick={() => moveControlIndex(idx, idx - 1)}
                            style={{ height: 24, padding: 0, minWidth: 24 }}
                          />
                        </Tooltip>

                        <Tooltip title="Move Down">
                          <Button
                            type="text"
                            size="small"
                            disabled={idx === controlClickOrder.length - 1}
                            icon={<ArrowDownOutlined />}
                            onClick={() => moveControlIndex(idx, idx + 1)}
                            style={{ height: 24, padding: 0, minWidth: 24 }}
                          />
                        </Tooltip>
                      </ActionButtonGroup>

                      <Tooltip title={t("utils.delete")}>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => deleteControlElementFromIndex(idx)}
                        />
                      </Tooltip>
                    </ControlItem>
                  ))}
                </Flex>
              ) : (
                <EmptyStateText>
                  {t("mission.task_table.no_control_sequence") ||
                    "No control sequence selected"}
                </EmptyStateText>
              )}
            </ControlDisplay>

            <Tooltip title={t("utils.reset")}>
              <Button
                icon={<RedoOutlined />}
                danger={controlClickOrder.length > 0}
                onClick={() => {
                  setControlClickOrder([]);
                  form.setFieldValue(["io", "fork"], {});
                }}
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 10,
                }}
              />
            </Tooltip>
          </Flex>

          {/* Control Buttons */}
          {controlList[actionState]?.length > 0 && (
            <Flex wrap gap="small">
              {(controlList[actionState] || []).map((movement) => (
                <Button
                  key={movement}
                  onClick={() => handleControlClick(movement)}
                >
                  {movement}
                </Button>
              ))}
            </Flex>
          )}
        </Card>

        {/* fork的動態 */}
        <Card style={{ marginBottom: 24 }}>
          <SectionHeader level={4}>Control Configuration</SectionHeader>
          <DynamicControlFields
            controlSequence={controlClickOrder}
            form={form}
            locationsOption={locationsOption}
          />
        </Card>

        {/* 地點選擇 */}
        {canSelectIsDefinedId() && (
          <Card style={{ marginBottom: 24 }}>
            <SectionHeader level={4}>Location Settings</SectionHeader>
            <Form.Item
              label={t("mission.task_table.is_custom_location")}
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
                label={t("mission.task_table.location")}
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
          </Card>
        )}

        {actionState === "spin" && (
          <Form.Item
            label={
              <Flex gap="small" align="center">
                <span>{t("mission.task_table.is_custom_yaw")}</span>
                <Tooltip title={t("mission.task_table.yaw_tooltip")}>
                  <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                </Tooltip>
              </Flex>
            }
            name="is_define_yaw"
          >
            <Segmented
              value={selectYaw}
              onChange={(e: YawGenre) => setSelectYaw(e)}
              options={SelectYawOptions}
            />
            {selectYaw === YawGenre.CUSTOM && (
              <Typography.Text
                type="secondary"
                style={{ marginTop: 8, display: "block" }}
              >
                {t("mission.task_table.yaw_custom_desc")}
              </Typography.Text>
            )}
            {selectYaw === YawGenre.SELECT && (
              <Typography.Text
                type="secondary"
                style={{ marginTop: 8, display: "block" }}
              >
                {t("mission.task_table.yaw_select_desc")}
              </Typography.Text>
            )}
            {selectYaw === YawGenre.CALCULATE_BY_AGV_AND_SHELF_ANGLE && (
              <Typography.Text
                type="secondary"
                style={{ marginTop: 8, display: "block" }}
              >
                {t("mission.task_table.yaw_calculate_desc")}
              </Typography.Text>
            )}
          </Form.Item>
        )}

        {actionState === "spin" && selectYaw === YawGenre.CUSTOM && (
          <Form.Item
            label={t("mission.task_table.yaw")}
            name="yaw"
            rules={[
              { required: true, message: t("mission.task_table.yaw_required") },
              {
                type: "number",
                min: -180,
                max: 180,
                message: t("mission.task_table.yaw_range"),
              },
            ]}
          >
            <InputNumber min={-180} max={180} addonAfter="°" />
          </Form.Item>
        )}

        {(actionState === "load" ||
          actionState === "offload" ||
          actionState === "fork") && (
          <Card style={{ marginBottom: 24 }}>
            <SectionHeader level={4}>
              {t("mission.task_table.level_title")}
            </SectionHeader>
            <Form.Item
              label={t("mission.task_table.is_custom_location")}
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
                label={t("mission.task_table.level")}
                name="level"
                rules={[
                  {
                    required: true,
                    message: t("utils.required"),
                  },
                ]}
              >
                <InputNumber min={1}></InputNumber>
              </Form.Item>
            )}
          </Card>
        )}

        {controlClickOrder.some((item) => item.startsWith("W")) && (
          <Form.Item label={t("mission.task_table.wait")} name="wait">
            <InputNumber min={1} placeholder="1" addonAfter="s" />
          </Form.Item>
        )}

        {/* Submit Section */}
        <Flex align="center" justify="center" style={{ padding: "24px 0" }}>
          <Form.Item>
            <Button
              type="primary"
              disabled={!submittable}
              htmlType="submit"
              loading={editMutation.isPending}
              size="large"
            >
              {t("utils.save")}
            </Button>
          </Form.Item>
        </Flex>
      </Form>
    </>
  );
};

export default TaskFormFork;
