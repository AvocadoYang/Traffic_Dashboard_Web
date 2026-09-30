import { Form, Input, InputNumber, Select, Switch, TimePicker } from "antd";
import React from "react";
import styled from "styled-components";
import dayjs from "dayjs";
import useMirTaskOptions, {
  useMirIoModuleOptions,
  useMirSoundOptions,
} from "./useMirTaskOptions";
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
  const { locationsOption, markerTypeLocationIds } = useMirTaskOptions();
  const form = Form.useFormInstance();

  const handleLocationChange = (value?: string) => {
    // 換成不是 type_1 貨架 / Shelf position 的位置：Marker type 不再適用，要清空
    if (!markerTypeLocationIds.has(value ?? "")) {
      form.setFieldValue("marker_type", null);
    }
  };

  return (
    <ParameterCard
      fieldName="location_id"
      label="Marker position"
      variableChildren={
        <Form.Item
          name="location_id"
          label={<FieldLabel>Default marker position</FieldLabel>}
          rules={[{ required: true, message: "請選擇預設的 Marker position" }]}
          style={{ marginTop: 12, marginBottom: 0 }}
        >
          <Select
            options={locationsOption}
            style={{ width: "100%" }}
            allowClear
            onChange={handleLocationChange}
          />
        </Form.Item>
      }
    >
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
          onChange={handleLocationChange}
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
  const { markerTypeOption, markerTypeLocationIds } = useMirTaskOptions();

  return (
    <ParameterCard fieldName="marker_type" label="Marker type">
      <Form.Item
        name="marker_type"
        dependencies={["is_current_position", "location_id"]}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              const needMarkerType =
                getFieldValue("is_current_position") ||
                markerTypeLocationIds.has(getFieldValue("location_id") ?? "");
              if (needMarkerType && !value) {
                return Promise.reject(new Error("請選擇 Marker type"));
              }
              if (!needMarkerType && value) {
                return Promise.reject(
                  new Error(
                    "只有 Current position、type_1 貨架或 Shelf position 可以設定 Marker type",
                  ),
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
    <ParameterCard
      fieldName="blocked_path_timeout"
      label="Blocked path timeout"
    >
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

// 即時向 MiR 查來的清單(音檔、IO module)共用
const liveSelectProps = ({
  amrId,
  isFetching,
  error,
  refetch,
  what,
}: {
  amrId?: string;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
  what: string;
}) => ({
  loading: isFetching,
  onOpenChange: (visible: boolean) => {
    // react-query v4 的手動 refetch 不管 enabled，沒車在線就別打空的 amrId
    if (visible && amrId) void refetch();
  },
  notFoundContent: isFetching
    ? "讀取中…"
    : !amrId
      ? "目前沒有連線中的 MiR 車輛"
      : error
        ? `讀取${what}失敗`
        : undefined,
});

export const MirSoundInput = () => {
  const { soundOption, ...sounds } = useMirSoundOptions();

  return (
    <ParameterCard fieldName="sound" label="Sound">
      <Form.Item name="sound" style={{ marginBottom: 0 }}>
        <Select
          options={soundOption}
          {...liveSelectProps({ ...sounds, what: "音檔清單" })}
        />
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
        <InputNumber min={0} max={100} precision={0} />
      </Form.Item>
      Set the volume of the sound. 100% is approximately 80 dB.
    </ParameterCard>
  );
};

export const MirSoundModeInput = () => {
  return (
    <ParameterCard fieldName="mode" label="Mode">
      <Form.Item name="mode" style={{ marginBottom: 0 }}>
        <Select
          options={[
            { value: "full", label: "Full" },
            { value: "custom", label: "Custom" },
          ]}
        />
      </Form.Item>
      Full plays the whole sound file. Custom truncates it to the duration
      below.
    </ParameterCard>
  );
};

export const MirDurationInput = () => {
  return (
    <ParameterCard fieldName="duration" label="Duration">
      <Form.Item name="duration" style={{ marginBottom: 0 }}>
        <TimePicker defaultOpenValue={dayjs("00:00:00", "HH:mm:ss")} />
      </Form.Item>
      Only used when Mode is Custom. Seconds is the smallest unit here.
    </ParameterCard>
  );
};

const lightEffectOption = [
  { value: "blink", label: "Blink" },
  { value: "cancel", label: "Cancel" },
  { value: "chase", label: "Chase" },
  { value: "fade", label: "Fade" },
  { value: "rainbow", label: "Rainbow" },
  { value: "solid", label: "Solid" },
  { value: "wave", label: "Wave" },
];

const lightSpeedOption = [
  { value: "fast", label: "Fast" },
  { value: "slow", label: "Slow" },
];

export const MirLightEffectInput = () => {
  return (
    <ParameterCard fieldName="light_effect" label="Light effect">
      <Form.Item name="light_effect" style={{ marginBottom: 0 }}>
        <Select options={lightEffectOption} />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirLightSpeedInput = () => {
  return (
    <ParameterCard fieldName="speed" label="Speed">
      <Form.Item name="speed" style={{ marginBottom: 0 }}>
        <Select options={lightSpeedOption} />
      </Form.Item>
    </ParameterCard>
  );
};

const colorOption = [
  { value: "#000000", label: "Black" },
  { value: "#0000ff", label: "Blue" }, // 確認過
  { value: "#00ffff", label: "Cyan" }, // 確認過
  { value: "#008000", label: "Green" },
  { value: "#ff00ff", label: "Magenta" },
  { value: "#ffa500", label: "Orange" },
  { value: "#ffc0cb", label: "Pink" },
  { value: "#ff0000", label: "Red" },
  { value: "#ffffff", label: "White" },
  { value: "#ffff00", label: "Yellow" },
];

const MirColorInput: React.FC<{
  fieldName: "color_1" | "color_2";
  label: string;
}> = ({ fieldName, label }) => {
  return (
    <ParameterCard fieldName={fieldName} label={label}>
      <Form.Item name={fieldName} style={{ marginBottom: 0 }}>
        <Select options={colorOption} />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirColor1Input = () => (
  <MirColorInput fieldName="color_1" label="Color 1" />
);

export const MirColor2Input = () => (
  <MirColorInput fieldName="color_2" label="Color 2" />
);

export const MirIntensityInput = () => {
  return (
    <ParameterCard fieldName="intensity" label="Intensity">
      <Form.Item name="intensity" style={{ marginBottom: 0 }}>
        <InputNumber min={0} max={100} precision={0} />
      </Form.Item>
      Brightness of the light, 0-100.
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
  const { ioModuleOption, amrId, isFetching, error, refetch } =
    useMirIoModuleOptions();

  const notFoundContent = () => {
    if (isFetching) return "讀取中…";
    if (!amrId) return "目前沒有連線中的 MiR 車輛";
    if (error) return "讀取 IO module 失敗";
    return undefined;
  };

  return (
    <ParameterCard fieldName="module" label="Module">
      <Form.Item name="module" style={{ marginBottom: 0 }}>
        <Select
          options={ioModuleOption}
          loading={isFetching}
          onOpenChange={(visible) => {
            if (visible && amrId) void refetch();
          }}
          notFoundContent={notFoundContent()}
        />
      </Form.Item>
    </ParameterCard>
  );
};

export const MirPortInput = () => {
  return (
    <ParameterCard fieldName="port" label="Port">
      <Form.Item name="port" style={{ marginBottom: 0 }}>
        <InputNumber min={0} max={3} precision={0} />
      </Form.Item>
      Enter which output port relay should be activated (0-3).
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

export const MirOptionInput = () => {
  return (
    <ParameterCard fieldName="option" label="Option">
      <Form.Item name="option" style={{ marginBottom: 0 }}>
        <Select
          options={[
            {
              value: "free",
              label: "Free",
            },
            {
              value: "occupied",
              label: "Occupied",
            },
          ]}
        />
      </Form.Item>
      Choose whether the position has to be free or occupied for the check to
      pass.
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
