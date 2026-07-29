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

export const MirLocationInput = () => {
  const { locationsOption } = useMirTaskOptions();

  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Marker position</FieldLabel>}
        name="location_id"
      >
        <Select options={locationsOption} style={{ width: "100%" }} />
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
        <Input  />
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
      <Form.Item 
      label={<FieldLabel>X</FieldLabel>} 
      name="x"
      initialValue={0}
      >
        <Input />
      </Form.Item>
    </IndustrialCard>
  );
};

export const MirYInput = () => {
  return (
    <IndustrialCard>
      <Form.Item 
      label={<FieldLabel>Y</FieldLabel>}
       name="y"
       initialValue={0}
       >
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
        <Switch  />
      </Form.Item>
    </IndustrialCard>
  );
};

{
  /* 圖層 */
}
export const MirFootprintInput = () => {
  return (
    <IndustrialCard>
      <Form.Item
        label={<FieldLabel>Set footprint</FieldLabel>}
        name="footprint"
      >
        <Select />
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
  return (
    <IndustrialCard>
      <Form.Item label={<FieldLabel>Sound</FieldLabel>} name="sound">
        <Select />
      </Form.Item>
     <span>
         Select a sound from the list. If you want to hear the sounds before selecting one, go to Setup  Sounds. You can hear the sounds on your computer by selecting Listen.
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
