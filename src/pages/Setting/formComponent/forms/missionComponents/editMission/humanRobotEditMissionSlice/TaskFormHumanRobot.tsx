import {
  Button,
  Flex,
  Form,
  InputNumber,
  message,
  Segmented,
  Select,
  Space,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  jointLimits,
  robotControl,
  robotType,
  robotUpperControl,
} from "./params";
import useMap from "@/api/useMap";
import SubmitButton from "@/utils/SubmitButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { Robot_Control, Robot_Type, Robot_Upper_Control } from "./type";
import useOneTaskDetailHumanRobot from "@/api/useOneTaskDetailHumanRobot";

function isWithinLimits(jointName: string, angle: number): boolean {
  const joint = jointLimits.find((j) => j.jointName === jointName);
  if (!joint) return false;
  return angle >= joint.limitRad && angle <= joint.limitRad2;
}

const TaskFormHumanRobot: FC<{
  editTaskKey: string;
  selectedMissionKey: string;
}> = ({ editTaskKey, selectedMissionKey }) => {
  const [actionState, setActionStatus] = useState<Robot_Type>();
  const { data: originFormData } = useOneTaskDetailHumanRobot(editTaskKey);
  const prevActionStateRef = useRef<Robot_Type | undefined>(actionState);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const mapData = useMap();

  const editTaskMutation = useMutation({
    mutationFn: (newData: {
      id: string;
      action_type: string[];
      control: string[];
      locationId?: string;
      params?: { joint: string; limitRad: number }[];
    }) => {
      return client.post("api/setting/update-task-human-robot", newData);
    },
    onSuccess: async (resData) => {
      await queryClient.refetchQueries({
        queryKey: ["all-relate-task-human-robot", resData.data.titleId],
      });
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const loc = useMemo(() => {
    return (
      mapData.data?.locations
        ?.map((v) => ({
          label: v.locationId,
          value: v.locationId,
        }))
        .sort((a, b) => Number(a.value) - Number(b.value)) ?? []
    );
  }, [mapData.data?.locations]);

  const robotTypeOptions: { label: string; value: Robot_Type }[] =
    robotType.map((type) => ({
      label: t(`mission.task_table_human_robot.${type}`),
      value: type,
    }));

  const robotControlOptions: { label: string; value: Robot_Control }[] =
    robotControl.map((type) => ({
      label: type,
      value: type,
    }));

  const robotUpperControlOptions: {
    label: string;
    value: Robot_Upper_Control;
  }[] = robotUpperControl.map((type) => ({
    label: type,
    value: type,
  }));

  const onFinish = (values: {
    action_type: Robot_Type;
    control: string[];
    locationId?: string;
    param?: { joint: string; limitRad: number }[];
  }) => {
    const params = values.param || [];

    if (values.param && values.param.length > 0) {
      const invalidJoint = values.param.find(({ joint, limitRad }) => {
        return !isWithinLimits(joint, limitRad);
      });

      if (invalidJoint) {
        const joint = jointLimits.find(
          (j) => j.jointName === invalidJoint.joint,
        );
        messageApi.error(
          `joint ${invalidJoint.joint} \n
          min: ${joint?.limitRad} \n
          max: ${joint?.limitRad2}`,
          5,
        );

        return;
      }
    }

    const payload = {
      missionTitleId: selectedMissionKey,
      id: editTaskKey,
      action_type: [values.action_type],
      control: values.control || [],
      locationId: values.locationId,
      params: params.length > 0 ? params : undefined,
    };

    editTaskMutation.mutate(payload);
  };
  useEffect(() => {
    if (originFormData) {
      const initialValues = {
        action_type: originFormData.operation?.type?.[0],
        control: originFormData.operation?.control,
        locationId: originFormData.operation?.locationId?.toString(),
        param: originFormData.operation?.param?.map((p) => ({
          joint: p.joint,
          limitRad: p.value,
        })),
      };

      form.setFieldsValue(initialValues);
      // Set initial action state
      if (originFormData.operation?.type?.[0]) {
        setActionStatus(originFormData.operation.type[0] as Robot_Type);
      }
    }
  }, [originFormData, form]);

  useEffect(() => {
    const shouldClear =
      (prevActionStateRef.current === "upper_control" &&
        actionState !== "upper_control") ||
      (["load", "offload", "move"].includes(prevActionStateRef.current || "") &&
        actionState === "upper_control");

    if (shouldClear) {
      form.setFieldsValue({ control: undefined, param: undefined });
    }

    prevActionStateRef.current = actionState;
  }, [actionState, form]);

  return (
    <>
      {contextHolder}
      <Form
        onFinish={onFinish}
        form={form}
        autoComplete="off"
        size="small"
        variant="underlined"
      >
        <Form.Item
          label={t("mission.task_table_human_robot.action")}
          name="action_type"
        >
          <Segmented
            onChange={(e: Robot_Type) => setActionStatus(e)}
            options={robotTypeOptions}
          />
        </Form.Item>

        <Form.Item
          label={t("mission.task_table_human_robot.action")}
          name="control"
        >
          {actionState === "upper_control" ? (
            <Select mode="multiple" options={robotUpperControlOptions} />
          ) : (
            <Select mode="multiple" options={robotControlOptions} />
          )}
        </Form.Item>

        {actionState === "upper_control" ? (
          <Form.Item
            label={t("mission.task_table_human_robot.control")}
            name="param"
          >
            <UpperSelect />
          </Form.Item>
        ) : (
          []
        )}

        <Form.Item label={t("mission.task_table.location")} name="locationId">
          <Select
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
            allowClear
            style={{ width: "100%" }}
            options={loc}
          />
        </Form.Item>

        <Form.Item label={null}>
          <Flex align="center" justify="center">
            <SubmitButton isModel={false} form={form} text="save" />
          </Flex>
        </Form.Item>
      </Form>
    </>
  );
};

export type Joint_Type = (typeof jointLimits)[number];

const UpperSelect = () => {
  const { t } = useTranslation();
  const jointOptions: { label: string; value: string }[] = jointLimits.map(
    (value) => ({
      label: value.jointName,
      value: value.jointName,
    }),
  );

  return (
    <Form.List name="param">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => {
            return (
              <Space
                key={key}
                style={{ display: "flex", marginBottom: 8 }}
                align="baseline"
              >
                <Form.Item
                  {...restField}
                  name={[name, "joint"]}
                  rules={[{ required: true, message: t("utils.required") }]}
                >
                  <Select
                    style={{ width: 200 }}
                    options={jointOptions}
                    placeholder={t("mission.task_table_human_robot.detail")}
                  />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, "limitRad"]}
                  rules={[{ required: true, message: t("utils.required") }]}
                >
                  <InputNumber
                    style={{ width: 150 }}
                    placeholder={t("mission.task_table_human_robot.limit")}
                  />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(name)} />
              </Space>
            );
          })}
          <Form.Item>
            <Button
              style={{ width: 350 }}
              type="dashed"
              onClick={() => add()}
              block
              icon={<PlusOutlined />}
            >
              {t("utils.add")}
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default TaskFormHumanRobot;
