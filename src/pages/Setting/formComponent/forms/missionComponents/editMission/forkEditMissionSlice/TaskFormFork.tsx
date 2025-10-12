import {
  Button,
  Flex,
  Form,
  Input,
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
import {
  Action_Type,
  Control_Types,
  Select_Active_Robot_Type,
  Select_Fork_Height_Type,
  Select_Location_Type,
} from "./types";
import { controlList } from "./params";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import useOneTaskDetailFork from "@/api/useOneTaskDetailFork";
import useTaskOptions from "./hook/useTaskOptions";

enum YawGenre {
  CUSTOM,
  SELECT,
  CALCULATE_BY_AGV_AND_SHELF_ANGLE,
}

type Form_Value = {
  action_type: string;
  control: string[];
  wait: number;
  is_define_id:
    | "custom"
    | "select"
    | "available_charge_station"
    | "back_to_load_place";
  locationId: string;
  is_define_yaw: YawGenre;
  yaw: number;
  fork_height_select: "custom" | "select" | "default";
  height: number;
  level: number;
  active_wait_amr: "enable" | "disable";
  waitOtherAmr: string;
  wait_genre: string;
};

const TaskFormFork: FC<{
  editTaskKey: string;
  selectedMissionCar: string;
  selectedMissionKey: string;
}> = ({ editTaskKey, selectedMissionKey }) => {
  const { data: originFormData } = useOneTaskDetailFork(editTaskKey);
  const [actionState, setActionStatus] = useState<Action_Type>();
  const [messageApi, contextHolder] = message.useMessage();
  const [isSpecialAction, setIsSpecialAction] = useState(false);
  const [controlClickOrder, setControlClickOrder] = useState<string[]>([]);
  const [selectLocationType, setSelectLocationType] =
    useState<Select_Location_Type>();
  const [selectYaw, setSelectYaw] = useState<YawGenre>();
  const [selectForkHeight, setSelectForkHeight] =
    useState<Select_Fork_Height_Type>();
  const [otherSpecial, setOtherSpecial] = useState(false);
  const [selectActiveWaitRobot, setSelectActiveWaitRobot] =
    useState<Select_Active_Robot_Type>();
  const [submittable, setSubmittable] = useState<boolean>(false);
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);
  const isIncludeSpin = controlClickOrder
    .map((v) => v.split("-")[0])
    .includes("S");
  const isIncludeH = controlClickOrder
    .map((v) => v.split("-")[0])
    .includes("H");
  const isIncludeClamp = controlClickOrder
    .map((v) => v.split("-")[0])
    .includes("clamp");
  const isIncludeTilt = controlClickOrder
    .map((v) => v.split("-")[0])
    .includes("tilt");
  const {
    robotOption,
    locationsOption,
    NormalActionListOptions,
    SpecialActionListOptions,
    SelectLocationOptions,
    SelectYawOptions,
    SelectForkHeightOptions,
    SelectActiveWaitRobotOptions,
    SelectWaitRobotOptions,
  } = useTaskOptions(actionState as Action_Type);

  const handleControlClick = (controlValue: string) => {
    setControlClickOrder((prevOrder) => {
      if (prevOrder.includes(controlValue)) {
        return prevOrder.filter((item) => item !== controlValue);
      }
      return [...prevOrder, controlValue];
    });

    setTimeout(() => {
      form.setFieldsValue({ control: controlClickOrder });
    }, 0);
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

    if (actionState === "spin" && !isIncludeSpin) {
      messageApi.warning(t("mission.task_table.spin_warn"));
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
      fork_height_select: selectForkHeight,
    };

    if (controlClickOrder.length === 0) {
      messageApi.warning(t("mission.task_table.control_warn"));
      return;
    }

    editMutation.mutate(newPayload);
  };

  const updateControlClickOrder = () => {
    if (!originFormData) return;

    const type = originFormData.operation.type as Action_Type;
    if (!controlList[type]) {
      console.warn(`Invalid action type: ${type}`);
      setControlClickOrder([]);
      setActionStatus(undefined);
      return;
    }

    setActionStatus(type);

    const controlSequence = controlList[type];
    const indexedControls = controlSequence
      .map((v, i) => `${v}-${i}`)
      .filter((v) =>
        originFormData.operation.control?.includes(v.split("-")[0])
      );

    setControlClickOrder(indexedControls);
  };

  useEffect(() => {
    if (originFormData) {
      updateControlClickOrder();

      setSelectLocationType(
        (originFormData.operation.is_define_id as Select_Location_Type) ||
          "custom"
      );
      setSelectYaw(
        originFormData.operation.is_define_yaw !== undefined
          ? (originFormData.operation.is_define_yaw as YawGenre)
          : undefined
      );
      setSelectForkHeight(
        originFormData.io?.fork?.is_define_height as Select_Fork_Height_Type
      );
      setOtherSpecial(originFormData.operation.waitGenre !== null);
      setSelectActiveWaitRobot(
        originFormData.operation.waitGenre !== null ? "enable" : "disable"
      );

      form.setFieldsValue({
        action_type: originFormData.operation.type,
        control: originFormData.operation.control?.map(
          (v: string, i: number) => `${v}-${i}`
        ),
        wait: originFormData.operation.wait,
        is_define_id: originFormData.operation.is_define_id,
        locationId: originFormData.operation.locationId?.toString(),
        is_define_yaw: originFormData.operation.is_define_yaw,
        yaw: originFormData.operation.yaw,
        fork_height_select: originFormData.io?.fork?.is_define_height,
        height: originFormData.io?.fork?.height,
        level: (originFormData.io?.fork?.level ?? 0) + 1 || 1,
        active_wait_amr:
          originFormData.operation.waitGenre !== null ? "enable" : "disable",
        waitOtherAmr: originFormData.operation.waitOtherAmr,
        wait_genre: originFormData.operation.waitGenre,
        tolerance: originFormData.operation.tolerance,
        lookahead: originFormData.operation.lookahead,
        camera_config: originFormData.io?.camera?.config || 0,
        modify_dis: originFormData.io?.camera?.modify_dis || 0,
        tilt: originFormData.io.fork.tilt || 0,
        clamp: originFormData.io.fork.clamp || 0,
      });
    }
  }, [originFormData, form]);

  useEffect(() => {
    if (!otherSpecial) {
      form.setFieldsValue({
        waitOtherAmr: null,
        wait_genre: null,
      });
    }
  }, [otherSpecial]);

  useEffect(() => {
    const value = form.getFieldsValue() as Form_Value;

    if (controlClickOrder.length === 0) {
      // console.log('bitch 1');
      setSubmittable(false);
      return;
    }

    if (controlClickOrder.includes("W")) {
      if (value.wait <= 0) {
        // console.log('bitch 2');
        setSubmittable(false);
        return;
      }
    }

    if (
      selectLocationType === "custom" &&
      !value.locationId &&
      actionState !== "spin"
    ) {
      // console.log('bitch 3');
      setSubmittable(false);
      return;
    }

    if (value?.active_wait_amr && value.active_wait_amr === "enable") {
      if (!value.waitOtherAmr || !value.wait_genre) {
        //     console.log('bitch 4');
        setSubmittable(false);
        return;
      }
    }

    if (
      selectYaw === YawGenre.CUSTOM &&
      isIncludeSpin &&
      (value.yaw === undefined || value.yaw < -180 || value.yaw > 180)
    ) {
      // console.log('bitch 5');
      setSubmittable(false);
      return;
    }

    setSubmittable(true);
  }, [form, values]);

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
        <Flex gap="large" justify="space-between">
          <Form.Item
            label={t("mission.task_table_human_robot.action")}
            name="action_type"
          >
            <Segmented
              onChange={(e: Action_Type) => setActionStatus(e)}
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

        <Flex align="center" justify="space-between">
          {actionState !== undefined ? (
            <Form.Item label={t("mission.task_table.action")} name="control">
              <Flex gap="small">
                {controlList[actionState].map((v, i) => {
                  const uniqueValue = `${v}-${i}`;
                  const movement = v as Control_Types;
                  let text = "";

                  switch (movement) {
                    case "F":
                      text = t("car_control_translate.F");
                      break;
                    case "H":
                      text = t("car_control_translate.H");
                      break;
                    case "S":
                      text = t("car_control_translate.S");
                      break;
                    case "B":
                      text = t("car_control_translate.B");
                      break;
                    case "W":
                      text = t("car_control_translate.W");
                      break;
                    case "clamp":
                      text = t("car_control_translate.clamp");
                      break;
                    case "tilt":
                      text = t("car_control_translate.tilt");
                      break;
                    default:
                      text = "unknown movement";
                  }

                  return (
                    <Tooltip
                      key={uniqueValue}
                      title={text}
                      mouseEnterDelay={0.5}
                    >
                      <Button
                        type={
                          controlClickOrder.includes(uniqueValue)
                            ? "primary"
                            : "default"
                        }
                        onClick={() => handleControlClick(uniqueValue)}
                      >
                        {v}
                      </Button>
                    </Tooltip>
                  );
                })}
              </Flex>
            </Form.Item>
          ) : (
            []
          )}
          <Flex>
            <Input
              disabled
              style={{ width: 200, marginBottom: 24 }}
              value={controlClickOrder
                .flatMap((v) => v.split("-")[0])
                .join(", ")}
            />
            <Tooltip title={t("utils.reset")}>
              <Button
                style={{ marginBottom: 24 }}
                icon={<RedoOutlined />}
                onClick={() => setControlClickOrder([])}
              />
            </Tooltip>
          </Flex>
        </Flex>

        {controlClickOrder.some((item) => item.startsWith("W")) && (
          <Form.Item label={t("mission.task_table.wait")} name="wait">
            <InputNumber min={1} placeholder="1" addonAfter="s" />
          </Form.Item>
        )}

        <Form.Item
          label={
            <Flex gap="small" align="center">
              <span>{t("mission.task_table.is_custom_location")}</span>
              <Tooltip title={t("mission.task_table.location_tooltip")}>
                <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
              </Tooltip>
            </Flex>
          }
          name="is_define_id"
        >
          <Select
            value={selectLocationType}
            onChange={(e: Select_Location_Type) => setSelectLocationType(e)}
            options={SelectLocationOptions}
          />

          {selectLocationType === "custom" && (
            <Typography.Text
              type="secondary"
              style={{ marginTop: 8, display: "block" }}
            >
              {t("mission.task_table.location_custom_desc")}
            </Typography.Text>
          )}
          {selectLocationType === "select" && (
            <Typography.Text
              type="secondary"
              style={{ marginTop: 8, display: "block" }}
            >
              {t("mission.task_table.location_select_desc")}
            </Typography.Text>
          )}
          {selectLocationType === "available_charge_station" && (
            <Typography.Text
              type="secondary"
              style={{ marginTop: 8, display: "block" }}
            >
              {t("mission.task_table.location_charge_station_desc")}
            </Typography.Text>
          )}
          {selectLocationType === "prepare_point" && (
            <Typography.Text
              type="secondary"
              style={{ marginTop: 8, display: "block" }}
            >
              {t("mission.task_table.prepare_point_desc")}
            </Typography.Text>
          )}
          {selectLocationType === "back_to_load_place" && (
            <Typography.Text
              type="secondary"
              style={{ marginTop: 8, display: "block" }}
            >
              {t("mission.task_table.back_to_load_place_desc")}
            </Typography.Text>
          )}
        </Form.Item>

        {selectLocationType === "custom" && actionState !== "spin" && (
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
              style={{ width: 210 }}
              options={locationsOption}
            />
          </Form.Item>
        )}

        {(actionState === "spin" || isIncludeSpin) && (
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

        {selectYaw === YawGenre.CUSTOM && isIncludeSpin && (
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
          isIncludeH) && (
          <Form.Item
            label={
              <Flex gap="small" align="center">
                <span>{t("mission.task_table.is_define_height")}</span>
                <Tooltip title={t("mission.task_table.fork_height_tooltip")}>
                  <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                </Tooltip>
              </Flex>
            }
            name="fork_height_select"
          >
            <Segmented
              value={selectForkHeight}
              onChange={(e: Select_Fork_Height_Type) => setSelectForkHeight(e)}
              options={SelectForkHeightOptions}
            />
            {selectForkHeight === "level" && (
              <Typography.Text
                type="secondary"
                style={{ marginTop: 8, display: "block" }}
              >
                {t("mission.task_table.fork_height_level_desc")}
              </Typography.Text>
            )}
            {selectForkHeight === "custom" && (
              <Typography.Text
                type="secondary"
                style={{ marginTop: 8, display: "block" }}
              >
                {t("mission.task_table.fork_height_custom_desc")}
              </Typography.Text>
            )}
            {selectForkHeight === "select" && (
              <Typography.Text
                type="secondary"
                style={{ marginTop: 8, display: "block" }}
              >
                {t("mission.task_table.fork_height_select_desc")}
              </Typography.Text>
            )}
            {selectForkHeight === "default" && (
              <Typography.Text
                type="secondary"
                style={{ marginTop: 8, display: "block" }}
              >
                {t("mission.task_table.fork_height_default_desc")}
              </Typography.Text>
            )}
          </Form.Item>
        )}

        {isIncludeClamp ? (
          <Form.Item
            label={t("mission.task_table.clamp")}
            name="clamp"
            rules={[
              {
                required: true,
              },
              {
                type: "number",
                min: 0,
                max: 900,
              },
            ]}
          >
            <InputNumber min={0} max={900} addonAfter="M" />
          </Form.Item>
        ) : null}

        {isIncludeTilt ? (
          <Form.Item
            label={t("mission.task_table.tilt")}
            name="tilt"
            rules={[
              {
                required: true,
              },
              {
                type: "number",
                min: -6,
                max: 6,
              },
            ]}
          >
            <InputNumber min={-6} max={6} addonAfter="°" />
          </Form.Item>
        ) : null}

        {selectForkHeight === "custom" && isIncludeH && (
          <Form.Item
            label={
              <Flex gap="small" align="center">
                <span>{t("mission.task_table.height")}</span>
                <Tooltip title={t("mission.task_table.camera_config")}>
                  <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                </Tooltip>
              </Flex>
            }
            name="height"
            rules={[
              {
                required: true,
                message: t("mission.task_table.height_required"),
              },
            ]}
          >
            <InputNumber min={1} placeholder="1" addonAfter="mm" />
          </Form.Item>
        )}

        {selectForkHeight === "level" && isIncludeH && (
          <Form.Item
            label={
              <Flex gap="small" align="center">
                <span>{t("mission.task_table.level")}</span>
                <Tooltip title={t("mission.task_table.camera_config")}>
                  <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                </Tooltip>
              </Flex>
            }
            name="level"
            rules={[
              {
                required: true,
                message: t("mission.task_table.height_required"),
              },
            ]}
          >
            <InputNumber
              min={1}
              placeholder="1"
              addonAfter={t("utils.floor")}
            />
          </Form.Item>
        )}

        {actionState === "load" ? (
          <>
            <Form.Item
              label={
                <Flex gap="small" align="center">
                  <span>{t("mission.task_table.camera_config")}</span>
                  <Tooltip title={t("mission.task_table.camera_config")}>
                    <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                  </Tooltip>
                </Flex>
              }
              name="camera_config"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber min={0} placeholder="1" addonAfter="mm" />
            </Form.Item>

            <Form.Item
              label={
                <Flex gap="small" align="center">
                  <span>{t("mission.task_table.modify_dis")}</span>
                  <Tooltip title={t("mission.task_table.modify_dis_info")}>
                    <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                  </Tooltip>
                </Flex>
              }
              name="modify_dis"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber min={0} placeholder="1" addonAfter="meter" />
            </Form.Item>
          </>
        ) : (
          []
        )}

        {actionState === "move" ? (
          <>
            <Form.Item
              label={
                <Flex gap="small" align="center">
                  <span>{t("mission.task_table.tolerance")}</span>
                  <Tooltip title={t("mission.task_table.tolerance")}>
                    <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                  </Tooltip>
                </Flex>
              }
              name="tolerance"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber min={1} placeholder="1" addonAfter="mm" />
            </Form.Item>

            <Form.Item
              label={
                <Flex gap="small" align="center">
                  <span>{t("mission.task_table.lookahead")}</span>
                  <Tooltip title={t("mission.task_table.lookahead")}>
                    <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
                  </Tooltip>
                </Flex>
              }
              name="lookahead"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber min={1} placeholder="1" addonAfter="mm" />
            </Form.Item>
          </>
        ) : (
          []
        )}

        <Flex gap="middle" style={{ marginBottom: 24 }}>
          <Button
            onClick={() => setOtherSpecial(!otherSpecial)}
            type={otherSpecial ? "primary" : "default"}
          >
            {t("mission.task_table.other_special")}
          </Button>
          <Tooltip title={t("mission.task_table.special_movement_info")}>
            <QuestionCircleOutlined />
          </Tooltip>
        </Flex>

        {otherSpecial && (
          <Form.Item
            label={t("mission.task_table.active_wait_amr")}
            name="active_wait_amr"
          >
            <Segmented
              onChange={(e: Select_Active_Robot_Type) =>
                setSelectActiveWaitRobot(e)
              }
              options={SelectActiveWaitRobotOptions}
            />
          </Form.Item>
        )}

        {otherSpecial && selectActiveWaitRobot === "enable" && (
          <Form.Item
            label={t("mission.task_table.wait_genre")}
            name="waitOtherAmr"
            rules={[
              {
                required: true,
                message: t("mission.task_table.wait_other_amr_required"),
              },
            ]}
          >
            <Select options={robotOption} />
          </Form.Item>
        )}

        {otherSpecial && selectActiveWaitRobot === "enable" && (
          <Form.Item
            label={t("mission.task_table.wait_genre")}
            name="wait_genre"
            rules={[
              {
                required: true,
                message: t("mission.task_table.wait_genre_required"),
              },
            ]}
          >
            <Segmented options={SelectWaitRobotOptions} />
          </Form.Item>
        )}

        <Flex align="center" justify="center">
          <Form.Item>
            <Button
              type="primary"
              disabled={!submittable}
              htmlType="submit"
              loading={editMutation.isLoading}
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
