import { Form, Input, InputNumber, Select, Switch, TimePicker } from "antd";
import React from "react";
import styled from "styled-components";
import dayjs from "dayjs";
import useMirTaskOptions from "./useMirTaskOptions";
import ParameterCard, { FieldLabel } from "./ParameterCard";

const SwitchContainer = styled.div`
  margin-top: 12px;
  padding-left: 8px;
  border-left: 2px solid #d9d9d9;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;
interface MirLocationInputProps {
  disabled?: boolean;
}
export const MirLocationInput: React.FC<MirLocationInputProps> = ({
  disabled = false,
}) => {
  const { locationsOption } = useMirTaskOptions();
  const form = Form.useFormInstance();

  return (
    <ParameterCard fieldName="location_id" label="Marker position">
      <Form.Item
        name="location_id"
        dependencies={["is_current_position"]}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              const isCurrentPosition = getFieldValue("is_current_position");
              if (isCurrentPosition) {
                // Current position 開啟時，marker position 必須留空
                if (value) {
                  return Promise.reject(
                    new Error(
                      "Current position 開啟時，Marker position 必須留空",
                    ),
                  );
                }
                return Promise.resolve();
              }
              // Current position 關閉時，marker position 必須有值
              if (!value) {
                return Promise.reject(new Error("請選擇 Marker position"));
              }
              return Promise.resolve();
            },
          }),
        ]}
        style={{ marginBottom: 12 }}
      >
        <Select
          options={locationsOption}
          style={{ width: "100%" }}
          disabled={disabled}
          allowClear
        />
      </Form.Item>

      {/* 電源/開關控制 */}
      <SwitchContainer>
        <FieldLabel style={{ color: "#1e2a4a", fontWeight: 600 }}>
          Current position
        </FieldLabel>
        <Form.Item
          name="is_current_position"
          valuePropName="checked"
          initialValue={false}
          style={{ marginBottom: 0 }}
        >
          <Switch
            onChange={(checked) => {
              if (checked) {
                // 開啟 Current position：marker position 要清空
                form.setFieldValue("location_id", null);
              } else {
                // 關閉 Current position：marker_type 要清空
                form.setFieldValue("marker_type", null);
              }
              // 兩個互相依賴的欄位重新驗證一次，錯誤訊息才會即時更新
              form.validateFields(["location_id", "marker_type"]).catch(() => {
                // 驗證失敗（例如另一個必填欄位還沒填）在這裡不用特別處理，
                // antd 會自己在對應欄位顯示錯誤訊息
              });
            }}
          />
        </Form.Item>
      </SwitchContainer>
    </ParameterCard>
  );
};

export const MirMarkerTypeInput = () => {
  const { markerTypeOption } = useMirTaskOptions();

  return (
    <ParameterCard fieldName="marker_type" label="Marker type">
      <Form.Item
        name="marker_type"
        dependencies={["is_current_position"]}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              const isCurrentPosition = getFieldValue("is_current_position");
              if (isCurrentPosition && !value) {
                return Promise.reject(
                  new Error("Current position 開啟時，請選擇 Marker type"),
                );
              }
              if (!isCurrentPosition && value) {
                return Promise.reject(
                  new Error("Current position 關閉時，Marker type 必須留空"),
                );
              }
              return Promise.resolve();
            },
          }),
        ]}
        style={{ marginBottom: 0 }}
      >
        <Select
          options={markerTypeOption}
          style={{ width: "100%" }}
          allowClear
        />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirBlockedPathTimeoutInputInput = () => {
  return (
    <ParameterCard fieldName="blocked_path_timeout" label="Blocked path timeout">
      <Form.Item
        name="blocked_path_timeout"
        initialValue={60}
        style={{ marginBottom: 0 }}
      >
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirBlockedDockingTimeoutInputInput = () => {
  return (
    <ParameterCard
      fieldName="blocked_docking_timeout"
      label="Blocked docking timeout"
    >
      <Form.Item
        name="blocked_docking_timeout"
        initialValue={60}
        style={{ marginBottom: 0 }}
      >
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirMaximumLinearSpeedInputInput = () => {
  return (
    <ParameterCard
      fieldName="maximum_linear_speed"
      label="Maximum linear speed"
    >
      <Form.Item
        name="maximum_linear_speed"
        initialValue={0.25}
        style={{ marginBottom: 0 }}
      >
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirMaximumAngularSpeedInputInput = () => {
  return (
    <ParameterCard
      fieldName="maximum_angular_speed"
      label="Maximum angular speed"
    >
      <Form.Item
        name="maximum_angular_speed"
        initialValue={0.25}
        style={{ marginBottom: 0 }}
      >
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirDistanceThresholdInput = () => {
  return (
    <ParameterCard fieldName="distance_threshold" label="Distance threshold">
      <Form.Item
        name="distance_threshold"
        initialValue={0.25}
        style={{ marginBottom: 0 }}
      >
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirXInput = () => {
  return (
    <ParameterCard fieldName="x" label="X">
      <Form.Item name="x" initialValue={0} style={{ marginBottom: 0 }}>
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirYInput = () => {
  return (
    <ParameterCard fieldName="y" label="Y">
      <Form.Item name="y" initialValue={0} style={{ marginBottom: 0 }}>
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirOrientationInput = () => {
  return (
    <ParameterCard fieldName="orientation" label="Orientation">
      <Form.Item
        name="orientation"
        initialValue={0}
        style={{ marginBottom: 0 }}
      >
        <Input />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirCollisionDetectionInput = () => {
  return (
    <ParameterCard fieldName="collision_detection" label="Collision detection">
      <Form.Item
        name="collision_detection"
        initialValue={true}
        style={{ marginBottom: 0 }}
      >
        <Switch />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirFootprintInput = () => {
  const { footprintOption } = useMirTaskOptions();

  return (
    <ParameterCard fieldName="footprint" label="Set footprint">
      <Form.Item name="footprint" style={{ marginBottom: 0 }}>
        <Select options={footprintOption} style={{ width: "100%" }} />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirSwitchMapInput = () => {
  const { locationsOption } = useMirTaskOptions();
  return (
    <ParameterCard fieldName="entry_position" label="Switch map">
      <Form.Item name="entry_position" style={{ marginBottom: 0 }}>
        <Select options={locationsOption} style={{ width: "100%" }} />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirWaitInput = () => {
  return (
    <ParameterCard fieldName="wait" label="Wait">
      <Form.Item name="wait" style={{ marginBottom: 0 }}>
        <TimePicker defaultOpenValue={dayjs("00:00:00", "HH:mm:ss")} />
      </Form.Item>
      Set an amount of time the robot should wait before moving to next action
      in the mission.
    </ParameterCard>
  );
};

export const MirSoundInput = () => {
  const { soundOption } = useMirTaskOptions();

  return (
    <ParameterCard fieldName="sound" label="Sound">
      <Form.Item name="sound" style={{ marginBottom: 0 }}>
        <Select options={soundOption} />
      </Form.Item>
      <span>
        Select a sound from the list. If you want to hear the sounds before
        selecting one, go to Setup Sounds. You can hear the sounds on your
        computer by selecting Listen.
      </span>
    </ParameterCard>
  );
};

export const MirVolumeInput = () => {
  return (
    <ParameterCard fieldName="volume" label="Volume">
      <Form.Item name="volume" style={{ marginBottom: 0 }}>
        <Input defaultValue={0} />
      </Form.Item>
      Set the volume of the sound. 100% is approximately 80 dB.
    </ParameterCard>
  );
};

const muteOption = [
  { label: "unmuted", value: "unmuted" },
  { label: "muted", value: "muted" },
];

export const MirFrontInput = () => {
  return (
    <ParameterCard fieldName="front" label="Front">
      <Form.Item name="front" style={{ marginBottom: 0 }}>
        <Select options={muteOption} />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirRearInput = () => {
  return (
    <ParameterCard fieldName="rear" label="Rear">
      <Form.Item name="rear" style={{ marginBottom: 0 }}>
        <Select options={muteOption} />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirSideInput = () => {
  return (
    <ParameterCard fieldName="sides" label="Side">
      <Form.Item name="sides" style={{ marginBottom: 0 }}>
        <Select options={muteOption} />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirModuleInput = () => {
  return (
    <ParameterCard fieldName="module" label="Module">
      <Form.Item name="module" style={{ marginBottom: 0 }}>
        <Select
          options={[
            {
              value: "mirconst-guid-0000-0001-internalIO00",
              label: "MiR Internal IOs",
            },
          ]}
        />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirPortInput = () => {
  return (
    <ParameterCard fieldName="port" label="Port">
      <Form.Item name="port" style={{ marginBottom: 0 }}>
        <InputNumber defaultValue={0} />
      </Form.Item>
      Enter which output port relay should be activated (1-4).
    </ParameterCard>
  );
};

export const MirOperationInput = () => {
  return (
    <ParameterCard fieldName="operation" label="Operation">
      <Form.Item name="operation" style={{ marginBottom: 0 }}>
        <Select
          options={[
            {
              value: "on",
              label: "ON",
            },
            {
              value: "off",
              label: "OFF",
            },
          ]}
        />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirTimeoutInput = () => {
  return (
    <ParameterCard fieldName="timeout" label="Timeout">
      <Form.Item name="timeout" style={{ marginBottom: 0 }}>
        <TimePicker defaultOpenValue={dayjs("00:00:00", "HH:mm:ss")} />
      </Form.Item>
      Set an amount of time the relay should stay on.
    </ParameterCard>
  );
};

export const MirValueInput = () => {
  return (
    <ParameterCard fieldName="value" label="Value">
      <Form.Item name="value" style={{ marginBottom: 0 }}>
        <Select
          options={[
            {
              value: "on",
              label: "ON",
            },
            {
              value: "off",
              label: "OFF",
            },
          ]}
        />
      </Form.Item>
    </ParameterCard>
  );
};
