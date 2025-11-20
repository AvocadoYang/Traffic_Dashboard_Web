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
import { QuestionCircleOutlined, RedoOutlined } from "@ant-design/icons";
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

// Styled Components
const ControlDisplay = styled.div<{ hasValue: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  min-width: 400px;
  padding: 8px 14px;
  border-radius: 10px;
  background: ${({ hasValue }) =>
    hasValue ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)"};
  border: 1px solid
    ${({ hasValue }) =>
      hasValue ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.2)"};
  color: ${({ hasValue }) => (hasValue ? "rgba(0, 70, 136, 0.95)" : "#aaa")};
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.4px;
  white-space: nowrap;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background: ${({ hasValue }) =>
      hasValue ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.08)"};
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const SectionHeader = styled(Typography.Title)`
  && {
    margin-bottom: 16px !important;
    font-size: 18px !important;
    color: #262626;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 8px;
  }
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
  const [selectYaw, setSelectYaw] = useState<YawGenre>();
  const [otherSpecial, setOtherSpecial] = useState(false);
  const [selectActiveWaitRobot, setSelectActiveWaitRobot] =
    useState<Select_Active_Robot_Type>("disable");
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
    SelectYawOptions,
    SelectActiveWaitRobotOptions,
    SelectWaitRobotOptions,
  } = useTaskOptions(actionState as Action_Type);

  const handleControlClick = (movement: string) => {
    setControlClickOrder((prev) => [...prev, movement]);
  };

  const handleRemoveControl = (index: number) => {
    setControlClickOrder((prev) => prev.filter((_, i) => i !== index));
    // Clear the form field for this control
    form.setFieldValue(["io", "fork", index.toString()], undefined);
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
      setSelectYaw(originFormData.operation.is_define_yaw as YawGenre);
      setOtherSpecial(originFormData.operation.waitGenre !== null);
      setSelectActiveWaitRobot(
        originFormData.operation.waitGenre !== null ? "enable" : "disable"
      );
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
              {controlClickOrder.length > 0
                ? controlClickOrder.map((ctrl, idx) => (
                    <span key={idx}>
                      {ctrl}
                      {idx < controlClickOrder.length - 1 && " → "}
                    </span>
                  ))
                : "No control sequence"}
            </ControlDisplay>

            <Tooltip title={t("utils.reset")}>
              <Button
                icon={<RedoOutlined />}
                danger={controlClickOrder.length > 0}
                onClick={() => {
                  setControlClickOrder([]);
                  form.setFieldValue(["io", "fork"], {});
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

        {/* Dynamic Control Fields Section */}
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
