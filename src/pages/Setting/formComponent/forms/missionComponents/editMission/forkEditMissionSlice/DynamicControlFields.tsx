import { FC } from "react";
import styled from "styled-components";
import { Collapse, Flex, Form, InputNumber, Select, Switch } from "antd";
import { useTranslation } from "react-i18next";
import { SettingOutlined, WarningOutlined } from "@ant-design/icons";

// Industrial Styled Components - Light Mode
const IndustrialControlCard = styled.div`
  margin-bottom: 12px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(24, 144, 255, 0.02) 2px,
      rgba(24, 144, 255, 0.02) 4px
    );
    pointer-events: none;
  }
`;

const CardHeader = styled.div`
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
`;

const StepBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-weight: 700;
  font-size: 11px;
  font-family: "Roboto Mono", monospace;
  box-shadow: 0 1px 4px rgba(24, 144, 255, 0.15);
`;

const CardTitle = styled.span`
  color: #262626;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

const CardBody = styled.div`
  padding: 16px;
  position: relative;
  z-index: 1;
`;

const FieldLabel = styled.div`
  color: #595959;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  font-family: "Roboto Mono", monospace;

  &.required::after {
    content: " *";
    color: #ff4d4f;
  }
`;

const IndustrialCollapse = styled(Collapse)`
  background: #ffffff;
  border: 1px solid #d9d9d9;

  .ant-collapse-header {
    background: #fafafa !important;
    border-bottom: 1px solid #d9d9d9 !important;
    color: #fa8c16 !important;
    font-family: "Roboto Mono", monospace !important;
    padding: 12px 16px !important;

    &:hover {
      background: #f0f5ff !important;
    }
  }

  .ant-collapse-content {
    background: #ffffff !important;
    border-top: 1px solid #d9d9d9;
  }

  .ant-collapse-content-box {
    padding: 16px;
    background: #ffffff !important;
  }

  /* Fix arrow icon color */
  .ant-collapse-arrow {
    color: #fa8c16 !important;
  }

  /* Override Ant Design's default collapse item background */
  &.ant-collapse > .ant-collapse-item {
    border-bottom: 1px solid #d9d9d9;
    background: #ffffff !important;
  }

  &.ant-collapse > .ant-collapse-item:last-child {
    border-bottom: none;
  }

  /* Ensure expanded state maintains light background */
  &.ant-collapse > .ant-collapse-item.ant-collapse-item-active {
    background: #ffffff !important;
  }
`;

const CollapseTitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 12px;
  font-weight: 600;

  .anticon {
    color: #fa8c16;
  }

  .count {
    color: #1890ff;
    background: #e6f7ff;
    padding: 2px 8px;
    border: 1px solid #1890ff;
    font-size: 10px;
    font-family: "Roboto Mono", monospace;
  }
`;

const IndustrialSwitch = styled(Switch)`
  &.ant-switch-checked {
    background: #1890ff;

    .ant-switch-inner {
      color: #ffffff;
    }
  }

  &:not(.ant-switch-checked) {
    background: #d9d9d9;

    .ant-switch-inner {
      color: #8c8c8c;
    }
  }
`;

const WarningText = styled.div`
  color: #fa8c16;
  font-size: 11px;
  margin-top: 4px;
  font-family: "Roboto Mono", monospace;
  display: flex;
  align-items: center;
  gap: 6px;

  .anticon {
    font-size: 12px;
  }
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
  options: Array<{ label: string; value: string }>;
  value?: string;
  onChange?: (value: string) => void;
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
      tilt: "TILT CONTROL",
      pallet_detection: "PALLET DETECTION",
      shelf_detection: "SHELF DETECTION",
      fork_height: "FORK HEIGHT",
      blind_fork: "BLIND FORK",
      clamp: "CLAMP CONTROL",
      baffle: "BAFFLE CONTROL",
      F: "FORWARD",
      B: "BACKWARD",
      S: "SPIN",
      W: "WAIT",
    };
    return labels[control] || control.toUpperCase();
  };

  const renderControlField = (control: string, index: number) => {
    const fieldName = ["io", "fork", index.toString()];

    switch (control) {
      case "tilt":
        return (
          <IndustrialControlCard key={`${control}-${index}`}>
            <CardHeader>
              <StepBadge>#{index + 1}</StepBadge>
              <CardTitle>{getControlLabel(control)}</CardTitle>
            </CardHeader>
            <CardBody>
              <Form.Item
                label={
                  <FieldLabel className="required">Tilt Angle (°)</FieldLabel>
                }
                name={[...fieldName, "tilt"]}
                rules={[
                  { required: true, message: "REQUIRED FIELD" },
                  {
                    type: "number",
                    min: -6,
                    max: 6,
                    message: "RANGE: -6° TO 6°",
                  },
                ]}
              >
                <InputNumber
                  min={-6}
                  max={6}
                  step={0.1}
                  addonAfter="°"
                  placeholder="-6.0 to 6.0"
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <WarningText>
                <WarningOutlined />
                VALID RANGE: -6.0° TO +6.0°
              </WarningText>
            </CardBody>
          </IndustrialControlCard>
        );

      case "pallet_detection":
        return (
          <IndustrialControlCard key={`${control}-${index}`}>
            <CardHeader>
              <StepBadge>#{index + 1}</StepBadge>
              <CardTitle>{getControlLabel(control)}</CardTitle>
            </CardHeader>
            <CardBody>
              <Form.Item
                label={
                  <FieldLabel className="required">
                    Modify Distance (mm)
                  </FieldLabel>
                }
                name={[...fieldName, "pallet_detection", "modify_dis"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
              >
                <InputNumber
                  step={0.1}
                  addonAfter="mm"
                  placeholder="Enter distance"
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label={<FieldLabel>Blind Mode</FieldLabel>}
                name={[...fieldName, "pallet_detection", "blind"]}
                valuePropName="checked"
              >
                <IndustrialSwitch
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                />
              </Form.Item>

              <Form.Item
                label={
                  <FieldLabel className="required">Goal Height (mm)</FieldLabel>
                }
                name={[...fieldName, "pallet_detection", "goal"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
              >
                <InputNumber
                  min={0}
                  addonAfter="mm"
                  placeholder="Enter goal height"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </CardBody>
          </IndustrialControlCard>
        );

      case "shelf_detection":
        return (
          <IndustrialControlCard key={`${control}-${index}`}>
            <CardHeader>
              <StepBadge>#{index + 1}</StepBadge>
              <CardTitle>{getControlLabel(control)}</CardTitle>
            </CardHeader>
            <CardBody>
              <Form.Item
                label={
                  <FieldLabel className="required">TX Value (mm)</FieldLabel>
                }
                name={[...fieldName, "shelf_detection", "tx"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
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
                label={
                  <FieldLabel className="required">
                    X Valid Range (mm)
                  </FieldLabel>
                }
                name={[...fieldName, "shelf_detection", "X_VALID_RANGE"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
              >
                <InputNumber
                  min={0}
                  addonAfter="mm"
                  placeholder="Enter X valid range"
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <FieldLabel className="required">
                    Y Valid Range (mm)
                  </FieldLabel>
                }
                name={[...fieldName, "shelf_detection", "Y_VALID_RANGE"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
              >
                <InputNumber
                  min={0}
                  addonAfter="mm"
                  placeholder="Enter Y valid range"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </CardBody>
          </IndustrialControlCard>
        );

      case "fork_height":
        return (
          <IndustrialControlCard key={`${control}-${index}`}>
            <CardHeader>
              <StepBadge>#{index + 1}</StepBadge>
              <CardTitle>{getControlLabel(control)}</CardTitle>
            </CardHeader>
            <CardBody>
              <Form.Item
                label={
                  <FieldLabel className="required">Height Mode</FieldLabel>
                }
                name={[...fieldName, "fork_height", "is_define_height"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
              >
                <IndustrialSegmented
                  options={[
                    { label: "CUSTOM", value: "custom" },
                    { label: "LEVEL", value: "level" },
                    { label: "SELECT", value: "select" },
                  ]}
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
                        label={
                          <FieldLabel className="required">
                            Height Value (mm)
                          </FieldLabel>
                        }
                        name={[...fieldName, "fork_height", "height"]}
                        rules={[{ required: true, message: "REQUIRED FIELD" }]}
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
            </CardBody>
          </IndustrialControlCard>
        );

      case "blind_fork":
        return (
          <IndustrialControlCard key={`${control}-${index}`}>
            <CardHeader>
              <StepBadge>#{index + 1}</StepBadge>
              <CardTitle>{getControlLabel(control)}</CardTitle>
            </CardHeader>
            <CardBody>
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
                      <Form.Item
                        label={<FieldLabel>Backward Location</FieldLabel>}
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
                                  "SELECT BACKWARD OR FORWARD",
                                );
                              return Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Select
                          showSearch={{
                            filterOption: (input, option) =>
                              (option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase()),
                          }}
                          options={locationsOption}
                          placeholder="SELECT BACKWARD LOCATION"
                          style={{ width: "100%" }}
                          disabled={!!forward}
                          onChange={() => {
                            form.setFieldValue(
                              [
                                ...fieldName,
                                "blind_fork",
                                "forward_location_id",
                              ],
                              undefined,
                            );
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        label={<FieldLabel>Forward Location</FieldLabel>}
                        name={[
                          ...fieldName,
                          "blind_fork",
                          "forward_location_id",
                        ]}
                        rules={[
                          {
                            validator: () => {
                              if (!backward && !forward)
                                return Promise.reject(
                                  "SELECT FORWARD OR BACKWARD",
                                );
                              return Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Select
                          showSearch={{
                            filterOption: (input, option) =>
                              (option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase()),
                          }}
                          options={locationsOption}
                          placeholder="SELECT FORWARD LOCATION"
                          style={{ width: "100%" }}
                          disabled={!!backward}
                          onChange={() => {
                            form.setFieldValue(
                              [
                                ...fieldName,
                                "blind_fork",
                                "backward_location_id",
                              ],
                              undefined,
                            );
                          }}
                        />
                      </Form.Item>

                      <WarningText>
                        <WarningOutlined />
                        SELECT EITHER BACKWARD OR FORWARD (MUTUALLY EXCLUSIVE)
                      </WarningText>
                    </>
                  );
                }}
              </Form.Item>
            </CardBody>
          </IndustrialControlCard>
        );

      case "clamp":
        return (
          <IndustrialControlCard key={`${control}-${index}`}>
            <CardHeader>
              <StepBadge>#{index + 1}</StepBadge>
              <CardTitle>{getControlLabel(control)}</CardTitle>
            </CardHeader>
            <CardBody>
              <Form.Item
                label={<FieldLabel className="required">Clamp Mode</FieldLabel>}
                name={[...fieldName, "clamp", "is_define_clamp"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
              >
                <IndustrialSegmented
                  options={[
                    { label: "CUSTOM", value: "custom" },
                    { label: "SELECT", value: "select" },
                  ]}
                />
              </Form.Item>

              <Form.Item noStyle shouldUpdate>
                {() => {
                  const clampType = form.getFieldValue([
                    ...fieldName,
                    "clamp",
                    "is_define_clamp",
                  ]);

                  if (
                    clampType === "custom" ||
                    clampType?.startsWith("preset")
                  ) {
                    return (
                      <Form.Item
                        label={
                          <FieldLabel className="required">
                            Clamp Height (mm)
                          </FieldLabel>
                        }
                        name={[...fieldName, "clamp", "height"]}
                        rules={[{ required: true, message: "REQUIRED FIELD" }]}
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

                  if (clampType === "level") {
                    return (
                      <>
                        <Form.Item
                          label={
                            <FieldLabel className="required">
                              Clamp Value (mm)
                            </FieldLabel>
                          }
                          name={[...fieldName, "clamp"]}
                          rules={[
                            { required: true, message: "REQUIRED FIELD" },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            max={900}
                            addonAfter="mm"
                            placeholder="0 to 900"
                          />
                        </Form.Item>
                        <WarningText>
                          <WarningOutlined />
                          VALID RANGE: 0 TO 900 MM
                        </WarningText>
                      </>
                    );
                  }

                  return null;
                }}
              </Form.Item>
            </CardBody>
          </IndustrialControlCard>
        );

      case "baffle":
        return (
          <IndustrialControlCard key={`${control}-${index}`}>
            <CardHeader>
              <StepBadge>#{index + 1}</StepBadge>
              <CardTitle>{getControlLabel(control)}</CardTitle>
            </CardHeader>
            <CardBody>
              <Form.Item
                label={
                  <FieldLabel className="required">
                    Baffle Value (mm)
                  </FieldLabel>
                }
                name={[...fieldName, "baffle"]}
                rules={[{ required: true, message: "REQUIRED FIELD" }]}
              >
                <InputNumber
                  min={1}
                  addonAfter="mm"
                  placeholder="Enter baffle"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </CardBody>
          </IndustrialControlCard>
        );

      default:
        return null;
    }
  };

  if (controlSequence.length === 0) {
    return null;
  }

  return (
    <IndustrialCollapse
      defaultActiveKey={["1"]}
      items={[
        {
          key: "1",
          label: (
            <CollapseTitleWrapper>
              <SettingOutlined />
              <span>{t("mission.task_form_fork.parameter_config")}</span>
              <span className="count">
                {controlSequence.length} {t("mission.task_form_fork.steps")}
              </span>
            </CollapseTitleWrapper>
          ),
          children: (
            <div>
              {controlSequence.map((control, index) =>
                renderControlField(control, index),
              )}
            </div>
          ),
        },
      ]}
    />
  );
};

export default DynamicControlFields;
