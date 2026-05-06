import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  RedoOutlined,
  UndoOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SaveOutlined,
  RollbackOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Button, Col, Form, InputNumber, message, Row, Select } from "antd";
import { FC, useEffect, useRef } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAtom, useSetAtom } from "jotai";
import client from "@/api/axiosClient";
import { IsEditPeripheralStyle, PeripheralEditData } from "@/utils/gloable";

type Options =
  | "areaType"
  | "translateX"
  | "translateY"
  | "rotate"
  | "scale"
  | "flex_direction";

type Val = {
  input: Options;
  value: number;
};

export type SubmitValue = {
  loc: number;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
};

type Event =
  | "up"
  | "down"
  | "left"
  | "right"
  | "r-rotate"
  | "l-rotate"
  | "scale-up"
  | "scale-down"
  | "";

const flexOption = [
  { value: "row", label: "ROW" },
  { value: "column", label: "COLUMN" },
  { value: "row-reverse", label: "ROW-REVERSE" },
  { value: "column-reverse", label: "COLUMN-REVERSE" },
];

// Industrial Styled Components
const IndustrialContainer = styled.div`
  background: #ffffff;
  border: 2px solid #d9d9d9;
  border-left: 4px solid #eb2f96;
  padding: 24px;
  font-family: "Roboto Mono", monospace;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const SectionHeader = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #eb2f96;
  padding: 10px 16px;
  margin-bottom: 20px;
  font-family: "Roboto Mono", monospace;
  color: #eb2f96;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ControlSection = styled.div`
  background: #fafafa;
  border: 2px solid #d9d9d9;
  padding: 16px;
  margin-bottom: 20px;
  border-left: 4px solid #eb2f96;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 2px dashed #d9d9d9;
`;

const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ControlLabel = styled.div`
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  font-weight: 600;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;

  &.back-btn {
    background: #ffffff;
    border: 1px solid #8c8c8c;
    color: #8c8c8c;

    &:hover {
      background: #fafafa;
      border-color: #595959;
      color: #595959;
    }
  }

  &.save-btn {
    background: #52c41a;
    border-color: #52c41a;
    color: #ffffff;

    &:hover {
      background: #73d13d;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.4);
    }
  }

  &.control-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;
    width: 100%;
    min-width: 40px;
    padding: 4px;

    &:hover {
      background: #fff0f6;
      border-color: #eb2f96;
      color: #eb2f96;
      box-shadow: 0 2px 8px rgba(235, 47, 150, 0.2);
    }

    &:active {
      background: #eb2f96;
      border-color: #eb2f96;
      color: #ffffff;
    }

    .anticon {
      font-size: 16px;
    }
  }

  &.direction-btn {
    border-color: #1890ff;
    color: #1890ff;

    &:hover {
      background: #f0f5ff;
      border-color: #40a9ff;
    }
  }

  &.rotate-btn {
    border-color: #faad14;
    color: #faad14;

    &:hover {
      background: #fffbe6;
      border-color: #ffc53d;
    }
  }

  &.scale-btn {
    border-color: #722ed1;
    color: #722ed1;

    &:hover {
      background: #f9f0ff;
      border-color: #9254de;
    }
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 16px;
  }

  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }
`;

const IndustrialInputNumber = styled(InputNumber)`
  width: 100%;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 40px;
  border-radius: 0;

  .ant-input-number-input {
    height: 38px;
    font-family: "Roboto Mono", monospace;
  }

  &:hover {
    border-color: #f759ab;
  }

  &.ant-input-number-focused {
    border-color: #eb2f96;
    box-shadow: 0 0 0 2px rgba(235, 47, 150, 0.2);
  }
`;

const IndustrialSelect = styled(Select)`
  font-family: "Roboto Mono", monospace;

  .ant-select-selector {
    height: 40px !important;
    border: 1px solid #d9d9d9 !important;
    border-radius: 0 !important;
    font-size: 12px;
    display: flex;
    align-items: center;

    &:hover {
      border-color: #f759ab !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #eb2f96 !important;
    box-shadow: 0 0 0 2px rgba(235, 47, 150, 0.2) !important;
  }

  .ant-select-selection-item {
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
  }
`;

const ValueDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff0f6;
  border: 1px solid #eb2f96;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;

  .label {
    color: #8c8c8c;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .value {
    color: #eb2f96;
    font-size: 14px;
    font-weight: 700;
  }
`;

const SettingStyleForm: FC = () => {
  const [form] = Form.useForm();
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectStation, setSelectStation] = useAtom(PeripheralEditData);
  const setIsEditStation = useSetAtom(IsEditPeripheralStyle);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const submitMutation = useMutation({
    mutationFn: (payload: SubmitValue) => {
      return client.post(
        "api/peripherals/edit-peripheral-station-style",
        payload
      );
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["loc-only"],
      });
      await queryClient.refetchQueries({ queryKey: ["peripheral-style"] });
      void messageApi.success(t("utils.success"));
    },
    onError: () => {
      void messageApi.error(t("other.edit_peripheral_style.error_message"));
    },
  });

  const saveStyle = () => {
    if (!selectStation) return;
    submitMutation.mutate(selectStation);
  };

  const handChange = (val: Val) => {
    setSelectStation((prev) => {
      if (!prev) return null;
      return {
        loc: prev.loc,
        peripheralType: prev.peripheralType,
        translateX: val.input === "translateX" ? val.value : prev.translateX,
        translateY: val.input === "translateY" ? val.value : prev.translateY,
        rotate: val.input === "rotate" ? val.value : prev.rotate,
        scale: val.input === "scale" ? val.value : prev.scale,
        flex_direction: prev.flex_direction,
      };
    });
  };

  const handleChangeFlex = (val: string) => {
    setSelectStation((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        flex_direction: val,
      };
    });
  };

  const handleBtnChange = (val: Val) => {
    setSelectStation((prev) => {
      if (!prev) return null;
      return {
        loc: prev.loc,
        peripheralType: prev.peripheralType,
        flex_direction: prev.flex_direction,
        translateX:
          val.input === "translateX"
            ? Number((val.value + prev.translateX).toFixed(1))
            : prev.translateX,
        translateY:
          val.input === "translateY"
            ? Number((val.value + prev.translateY).toFixed(1))
            : prev.translateY,
        rotate:
          val.input === "rotate"
            ? Number((val.value + prev.rotate).toFixed(1))
            : prev.rotate,
        scale:
          val.input === "scale"
            ? Number((val.value + prev.scale).toFixed(1))
            : prev.scale,
      };
    });
  };

  const transformStyle = (event: Event) => {
    switch (event) {
      case "up":
        handleBtnChange({ input: "translateY", value: -0.1 });
        break;
      case "down":
        handleBtnChange({ input: "translateY", value: +0.1 });
        break;
      case "left":
        handleBtnChange({ input: "translateX", value: -0.1 });
        break;
      case "right":
        handleBtnChange({ input: "translateX", value: 0.1 });
        break;
      case "r-rotate":
        handleBtnChange({ input: "rotate", value: -1 });
        break;
      case "l-rotate":
        handleBtnChange({ input: "rotate", value: 1 });
        break;
      case "scale-up":
        handleBtnChange({ input: "scale", value: 0.1 });
        break;
      case "scale-down":
        handleBtnChange({ input: "scale", value: -0.1 });
        break;
      default:
        console.log("error");
    }
  };

  const handleButtonPress = (event: Event) => {
    if (intervalId.current) return;
    transformStyle(event);
    intervalId.current = setInterval(() => {
      transformStyle(event);
    }, 50);
  };

  const stopCounter = () => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  };

  useEffect(() => {
    if (!selectStation) return;
    form.setFieldValue("translateX", selectStation.translateX);
    form.setFieldValue("translateY", selectStation.translateY);
    form.setFieldValue("scale", selectStation.scale);
    form.setFieldValue("rotate", selectStation.rotate);
    form.setFieldValue("flex_direction", selectStation.flex_direction);
  }, [selectStation, form]);

  useEffect(() => {
    return () => stopCounter();
  }, []);

  if (!selectStation) return null;

  return (
    <>
      {contextHolder}
      <IndustrialContainer>
        <SectionHeader>
          <SettingOutlined />
          {t("other.edit_peripheral_style.title", {
            location: selectStation.loc,
          })}
        </SectionHeader>

        {/* Current Values Display */}
        <ValueDisplay>
          <span className="label">X:</span>
          <span className="value">{selectStation.translateX.toFixed(1)}</span>
          <span className="label">Y:</span>
          <span className="value">{selectStation.translateY.toFixed(1)}</span>
          <span className="label">Rotate:</span>
          <span className="value">{selectStation.rotate.toFixed(1)}°</span>
          <span className="label">Scale:</span>
          <span className="value">{selectStation.scale.toFixed(1)}x</span>
        </ValueDisplay>

        {/* Action Bar */}
        <ActionBar>
          <IndustrialButton
            className="back-btn"
            onClick={() => setIsEditStation(false)}
            icon={<RollbackOutlined />}
          >
            {t("utils.back")}
          </IndustrialButton>
          <IndustrialButton
            className="save-btn"
            onClick={() => saveStyle()}
            icon={<SaveOutlined />}
            loading={submitMutation.isLoading}
          >
            {t("utils.save")}
          </IndustrialButton>
        </ActionBar>

        {/* Control Section */}
        <ControlSection>
          <ControlLabel>
            <ArrowUpOutlined />{" "}
            {t("other.edit_peripheral_style.position_controls")}
          </ControlLabel>
          <ControlGrid>
            <IndustrialButton
              className="control-btn direction-btn"
              onMouseDown={() => handleButtonPress("up")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<ArrowUpOutlined />}
              title={t("other.edit_peripheral_style.move_up")}
            />
            <IndustrialButton
              className="control-btn direction-btn"
              onMouseDown={() => handleButtonPress("down")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<ArrowDownOutlined />}
              title={t("other.edit_peripheral_style.move_down")}
            />
            <IndustrialButton
              className="control-btn direction-btn"
              onMouseDown={() => handleButtonPress("left")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<ArrowLeftOutlined />}
              title={t("other.edit_peripheral_style.move_left")}
            />
            <IndustrialButton
              className="control-btn direction-btn"
              onMouseDown={() => handleButtonPress("right")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<ArrowRightOutlined />}
              title={t("other.edit_peripheral_style.move_right")}
            />
          </ControlGrid>

          <ControlLabel style={{ marginTop: 16 }}>
            <RedoOutlined />{" "}
            {t("other.edit_peripheral_style.rotation_controls")}
          </ControlLabel>
          <ControlGrid>
            <IndustrialButton
              className="control-btn rotate-btn"
              onMouseDown={() => handleButtonPress("l-rotate")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<RedoOutlined />}
              title={t("other.edit_peripheral_style.rotate_clockwise")}
            />
            <IndustrialButton
              className="control-btn rotate-btn"
              onMouseDown={() => handleButtonPress("r-rotate")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<UndoOutlined />}
              title={t("other.edit_peripheral_style.rotate_counter_clockwise")}
            />
          </ControlGrid>

          <ControlLabel style={{ marginTop: 16 }}>
            <FullscreenOutlined />{" "}
            {t("other.edit_peripheral_style.scale_controls")}
          </ControlLabel>
          <ControlGrid>
            <IndustrialButton
              className="control-btn scale-btn"
              onMouseDown={() => handleButtonPress("scale-up")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<FullscreenOutlined />}
              title={t("other.edit_peripheral_style.scale_up")}
            />
            <IndustrialButton
              className="control-btn scale-btn"
              onMouseDown={() => handleButtonPress("scale-down")}
              onMouseUp={stopCounter}
              onMouseLeave={stopCounter}
              icon={<FullscreenExitOutlined />}
              title={t("other.edit_peripheral_style.scale_down")}
            />
          </ControlGrid>
        </ControlSection>

        {/* Form Section */}
        <SectionHeader>
          <SettingOutlined />
          {t("other.edit_peripheral_style.manual_input")}
        </SectionHeader>
        <StyledForm
          form={form}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
        >
          <Form.Item
            label={t("other.edit_peripheral_style.translate_x")}
            name="translateX"
          >
            <IndustrialInputNumber
              value={selectStation.translateX}
              step={0.1}
              onChange={(e) =>
                handChange({
                  input: "translateX",
                  value: Number(e),
                })
              }
            />
          </Form.Item>

          <Form.Item
            label={t("other.edit_peripheral_style.translate_y")}
            name="translateY"
          >
            <IndustrialInputNumber
              value={selectStation.translateY}
              step={0.1}
              onChange={(e) =>
                handChange({
                  input: "translateY",
                  value: Number(e),
                })
              }
            />
          </Form.Item>

          <Form.Item
            label={t("other.edit_peripheral_style.scale")}
            name="scale"
          >
            <IndustrialInputNumber
              value={selectStation.scale}
              step={0.1}
              min={0.1}
              onChange={(e) =>
                handChange({
                  input: "scale",
                  value: Number(e),
                })
              }
            />
          </Form.Item>

          <Form.Item
            label={t("other.edit_peripheral_style.rotate")}
            name="rotate"
          >
            <IndustrialInputNumber
              value={selectStation.rotate}
              step={1}
              onChange={(e) =>
                handChange({
                  input: "rotate",
                  value: Number(e),
                })
              }
              addonAfter="°"
            />
          </Form.Item>

          <Form.Item
            label={t("other.edit_peripheral_style.flex_direction")}
            name="flex_direction"
          >
            <IndustrialSelect
              value={selectStation.flex_direction}
              options={flexOption}
              onChange={(e) => handleChangeFlex(e)}
            />
          </Form.Item>
        </StyledForm>
      </IndustrialContainer>
    </>
  );
};

export default SettingStyleForm;
