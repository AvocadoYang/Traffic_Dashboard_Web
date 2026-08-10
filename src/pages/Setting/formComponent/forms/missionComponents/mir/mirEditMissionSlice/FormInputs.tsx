import { ToolOutlined } from "@ant-design/icons";
import { Form, Input, Select, Switch, TimePicker } from "antd";
import React from "react";
import styled from "styled-components";
import useMirTaskOptions from "./useMirTaskOptions";
import dayjs from "dayjs";

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

const FieldLabel = styled.span`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

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
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Marker position</FieldLabel>}
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
    </IndustrialCard>
  );
};

export const MirMarkerTypeInput = () => {
  const { markerTypeOption } = useMirTaskOptions();

  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Marker type</FieldLabel>}
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
      >
        <Select
          options={markerTypeOption}
          style={{ width: "100%" }}
          allowClear
        />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirBlockedPathTimeoutInputInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Blocked path timeout</FieldLabel>}
        name="blocked_path_timeout"
        initialValue={60}
      >
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirBlockedDockingTimeoutInputInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Blocked docking timeout</FieldLabel>}
        name="blocked_docking_timeout"
        initialValue={60}
      >
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirMaximumLinearSpeedInputInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Maximum linear speed</FieldLabel>}
        name="maximum_linear_speed"
        initialValue={0.25}
      >
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirMaximumAngularSpeedInputInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Maximum angular speed</FieldLabel>}
        name="maximum_angular_speed"
        initialValue={0.25}
      >
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirDistanceThresholdInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Distance threshold</FieldLabel>}
        name="distance_threshold"
        initialValue={0.25}
      >
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirXInput = () => {
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>X</FieldLabel>} name="x" initialValue={0}>
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirYInput = () => {
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Y</FieldLabel>} name="y" initialValue={0}>
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirOrientationInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Orientation</FieldLabel>}
        name="orientation"
        initialValue={0}
      >
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirCollisionDetectionInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Collision detection</FieldLabel>}
        name="collision_detection"
        initialValue={true}
      >
        <Switch />
      </Form.Item>
    </IndustrialCard>
  );
};

{
  /* 圖層 */
}
export const MirFootprintInput = () => {
  const { footprintOption } = useMirTaskOptions();

  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Set footprint</FieldLabel>}
        name="footprint"
      >
        <Select options={footprintOption} style={{ width: "100%" }} />
      </Form.Item>
    </IndustrialCard>
  );
};

{
  /* 切換地圖 */
}
export const MirSwitchMapInput = () => {
  const { locationsOption } = useMirTaskOptions();
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Switch map</FieldLabel>}
        name="entry_position"
      >
        <Select options={locationsOption} style={{ width: "100%" }} />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirWaitInput = () => {
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Wait</FieldLabel>} name="wait">
        <TimePicker defaultOpenValue={dayjs("00:00:00", "HH:mm:ss")} />
      </Form.Item>
      Set an amount of time the robot should wait before moving to next action
      in the mission.
    </IndustrialCard>
  );
};

export const MirSoundInput = () => {
  const { soundOption } = useMirTaskOptions();

  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Sound</FieldLabel>} name="sound">
        <Select options={soundOption} />
      </Form.Item>
      <span>
        Select a sound from the list. If you want to hear the sounds before
        selecting one, go to Setup Sounds. You can hear the sounds on your
        computer by selecting Listen.
      </span>
    </IndustrialCard>
  );
};

export const MirVolumeInput = () => {
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Volume</FieldLabel>} name="volume">
        <Input defaultValue={0} />
      </Form.Item>
      Set the volume of the sound. 100% is approximately 80 dB.
    </IndustrialCard>
  );
};

const muteOption = [
  { label: "unmuted", value: "unmuted" },
  { label: "muted", value: "muted" },
];

export const MirFrontInput = () => {
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Front</FieldLabel>} name="front">
        <Select options={muteOption} />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirRearInput = () => {
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Rear</FieldLabel>} name="rear">
        <Select options={muteOption} />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirSideInput = () => {
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Side</FieldLabel>} name="sides">
        <Select options={muteOption} />
      </Form.Item>
    </IndustrialCard>
  );
};