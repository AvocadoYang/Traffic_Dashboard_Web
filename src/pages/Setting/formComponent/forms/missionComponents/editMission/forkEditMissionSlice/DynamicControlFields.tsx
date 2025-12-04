import { FC } from "react";
import { Select_Fork_Height_Type } from "./types";
import styled from "styled-components";
import {
  Button,
  Card,
  Collapse,
  Flex,
  Form,
  InputNumber,
  Segmented,
  Select,
  Switch,
  Typography,
} from "antd";
import { useTranslation } from "react-i18next";
import { SettingOutlined } from "@ant-design/icons";

const ControlCard = styled(Card)`
  margin-bottom: 16px;
  border-left: 3px solid #1890ff;

  .ant-card-head {
    background: #f0f5ff;
    min-height: 40px;
    padding: 8px 16px;
  }

  .ant-card-body {
    padding: 16px;
  }
`;

const StepBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  font-weight: bold;
  font-size: 12px;
  margin-right: 8px;
`;

interface DynamicControlFieldsProps {
  controlSequence: string[];
  form: any;
  locationsOption: any[];
}

const DynamicControlFields: FC<DynamicControlFieldsProps> = ({
  controlSequence,
  form,
  locationsOption,
}) => {
  const { t } = useTranslation();
  const getControlLabel = (control: string) => {
    const labels: Record<string, string> = {
      tilt: t("mission.task_table.tilt"),
      pallet_detection: "Pallet Detection",
      fork_height: "Fork Height",
      blind_fork: "Blind Fork",
      clamp: t("mission.task_table.clamp"),

      B: "Backward",
      S: "Spin",
      W: "Wait",
    };
    return labels[control] || control;
  };

  const renderControlField = (control: string, index: number) => {
    const fieldName = ["io", "fork", index.toString()];

    switch (control) {
      case "tilt":
        return (
          <ControlCard
            key={`${control}-${index}`}
            size="small"
            title={
              <Flex align="center">
                <StepBadge>{index + 1}</StepBadge>
                {getControlLabel(control)}
              </Flex>
            }
          >
            <Form.Item
              label={t("mission.task_table.tilt")}
              name={[...fieldName, "tilt"]}
              rules={[
                { required: true, message: t("utils.required") },
                {
                  type: "number",
                  min: -6,
                  max: 6,
                  message: "Range: -6° to 6°",
                },
              ]}
            >
              <InputNumber
                min={-6}
                max={6}
                step={0.1}
                addonAfter="°"
                placeholder="Enter tilt angle"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </ControlCard>
        );

      case "pallet_detection":
        return (
          <ControlCard
            key={`${control}-${index}`}
            size="small"
            title={
              <Flex align="center">
                <StepBadge>{index + 1}</StepBadge>
                {getControlLabel(control)}
              </Flex>
            }
          >
            <Form.Item
              label="Modify Distance"
              name={[...fieldName, "pallet_detection", "modify_dis"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber
                step={0.1}
                addonAfter="mm"
                placeholder="Enter distance"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="Blind Mode"
              name={[...fieldName, "pallet_detection", "blind"]}
              valuePropName="checked"
            >
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>

            <Form.Item
              label="Goal Height"
              name={[...fieldName, "pallet_detection", "goal"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber
                min={0}
                addonAfter="mm"
                placeholder="Enter goal height"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </ControlCard>
        );

      case "shelf_detection":
        return (
          <ControlCard
            key={`${control}-${index}`}
            size="small"
            title={
              <Flex align="center">
                <StepBadge>{index + 1}</StepBadge>
                {getControlLabel(control)}
              </Flex>
            }
          >
            <Form.Item
              label="tx"
              name={[...fieldName, "shelf_detection", "tx"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber
                min={0}
                step={0.1}
                addonAfter="mm"
                placeholder="Enter tx"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="X_VALID_RANGE"
              name={[...fieldName, "shelf_detection", "X_VALID_RANGE"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber
                min={0}
                addonAfter="mm"
                placeholder="Enter X_VALID_RANGE"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="Y_VALID_RANGE"
              name={[...fieldName, "shelf_detection", "Y_VALID_RANGE"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber
                min={0}
                addonAfter="mm"
                placeholder="Enter Y_VALID_RANGE"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </ControlCard>
        );

      case "fork_height":
        return (
          <ControlCard
            key={`${control}-${index}`}
            size="small"
            title={
              <Flex align="center">
                <StepBadge>{index + 1}</StepBadge>
                {getControlLabel(control)}
              </Flex>
            }
          >
            <Form.Item
              label={t("mission.task_table.is_define_height")}
              name={[...fieldName, "fork_height", "is_define_height"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Segmented
                options={[
                  { label: "Custom", value: "custom" },
                  { label: "Level", value: "level" },
                  { label: "Select", value: "select" },
                ]}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item noStyle shouldUpdate>
              {() => {
                const heightType = form.getFieldValue([
                  ...fieldName,
                  "fork_height",
                  "is_define_height",
                ]);

                if (
                  heightType === "custom" ||
                  heightType?.startsWith("preset")
                ) {
                  return (
                    <Form.Item
                      label={t("mission.task_table.height")}
                      name={[...fieldName, "fork_height", "height"]}
                      rules={[{ required: true, message: t("utils.required") }]}
                    >
                      <InputNumber
                        min={0}
                        addonAfter="mm"
                        placeholder="Enter height"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  );
                }

                return null;
              }}
            </Form.Item>
          </ControlCard>
        );

      case "blind_fork":
        return (
          <ControlCard
            key={`${control}-${index}`}
            size="small"
            title={
              <Flex align="center">
                <StepBadge>{index + 1}</StepBadge>
                {getControlLabel(control)}
              </Flex>
            }
          >
            <Form.Item noStyle shouldUpdate>
              {() => {
                const backward = form.getFieldValue([
                  ...fieldName,
                  "blind_fork",
                  "backward_location_id",
                ]);

                const forward = form.getFieldValue([
                  ...fieldName,
                  "blind_fork",
                  "forward_location_id",
                ]);

                return (
                  <>
                    {/* Backward */}
                    <Form.Item
                      label="Backward Location"
                      name={[
                        ...fieldName,
                        "blind_fork",
                        "backward_location_id",
                      ]}
                      rules={[
                        {
                          validator: () => {
                            if (!backward && !forward)
                              return Promise.reject(
                                "Select Backward or Forward"
                              );
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Select
                        showSearch
                        options={locationsOption}
                        placeholder="Select backward location"
                        style={{ width: "100%" }}
                        disabled={!!forward} // disable if forward chosen
                        onChange={() => {
                          // clear forward if backward picked
                          form.setFieldValue(
                            [...fieldName, "blind_fork", "forward_location_id"],
                            undefined
                          );
                        }}
                      />
                    </Form.Item>

                    {/* Forward */}
                    <Form.Item
                      label="Forward Location"
                      name={[...fieldName, "blind_fork", "forward_location_id"]}
                      rules={[
                        {
                          validator: () => {
                            if (!backward && !forward)
                              return Promise.reject(
                                "Select Forward or Backward"
                              );
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Select
                        showSearch
                        options={locationsOption}
                        placeholder="Select forward location"
                        style={{ width: "100%" }}
                        disabled={!!backward} // disable if backward chosen
                        onChange={() => {
                          // clear backward if forward picked
                          form.setFieldValue(
                            [
                              ...fieldName,
                              "blind_fork",
                              "backward_location_id",
                            ],
                            undefined
                          );
                        }}
                      />
                    </Form.Item>
                  </>
                );
              }}
            </Form.Item>
          </ControlCard>
        );

      case "clamp":
        return (
          <ControlCard
            key={`${control}-${index}`}
            size="small"
            title={
              <Flex align="center">
                <StepBadge>{index + 1}</StepBadge>
                {getControlLabel(control)}
              </Flex>
            }
          >
            <Form.Item
              label={t("mission.task_table.is_define_height")}
              name={[...fieldName, "clamp", "is_define_clamp"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Segmented
                options={[
                  { label: "Custom", value: "custom" },
                  { label: "Select", value: "select" },
                ]}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item noStyle shouldUpdate>
              {() => {
                const heightType = form.getFieldValue([
                  ...fieldName,
                  "clamp",
                  "is_define_clamp",
                ]);

                if (
                  heightType === "custom" ||
                  heightType?.startsWith("preset")
                ) {
                  return (
                    <Form.Item
                      label={t("mission.task_table.clamp")}
                      name={[...fieldName, "clamp", "height"]}
                      rules={[{ required: true, message: t("utils.required") }]}
                    >
                      <InputNumber
                        min={0}
                        addonAfter="mm"
                        placeholder="Enter height"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  );
                }

                if (heightType === "level") {
                  return (
                    <Form.Item
                      label={t("mission.task_table.clamp")}
                      name={[...fieldName, "clamp"]}
                      rules={[{ required: true, message: t("utils.required") }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        max={900}
                        addonAfter="mm"
                        placeholder="Enter clamp value"
                      />
                    </Form.Item>
                  );
                }

                return null;
              }}
            </Form.Item>
          </ControlCard>
        );

      case "baffle":
        return (
          <ControlCard
            key={`${control}-${index}`}
            size="small"
            title={
              <Flex align="center">
                <StepBadge>{index + 1}</StepBadge>
                {getControlLabel(control)}
              </Flex>
            }
          >
            <Form.Item
              label={"baffle"}
              name={[...fieldName, "baffle"]}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber
                min={1}
                addonAfter="mm"
                placeholder="Enter baffle"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </ControlCard>
        );

      default:
        // For F, B, S - no additional config needed
        return null;
    }
  };

  return (
    <>
      {controlSequence.length > 0 && (
        <Collapse
          defaultActiveKey={["1"]}
          items={[
            {
              key: "1",
              label: (
                <Flex align="center" gap="small">
                  <SettingOutlined />
                  <strong>Control Sequence Configuration</strong>
                  <Typography.Text type="secondary">
                    ({controlSequence.length} steps)
                  </Typography.Text>
                </Flex>
              ),
              children: (
                <div>
                  {controlSequence.map((control, index) =>
                    renderControlField(control, index)
                  )}
                </div>
              ),
            },
          ]}
          style={{ marginBottom: 24 }}
        />
      )}
    </>
  );
};

export default DynamicControlFields;
