import { FC, ReactNode, useEffect, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Popover,
  Select,
  Switch,
  TimePicker,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";
import styled from "styled-components";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Mir_Action } from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/type";
import {
  useMirVariableField,
  useMirVariableFields,
} from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/MirVariableContext";
import { c, font, space } from "../../../../ui/tokens";
import {
  DangerButton,
  FieldLabel,
  GhostButton,
  Hint,
  SolidButton,
  Toolbar,
} from "../../../../ui/primitives";
import { ACTION_FIELDS, MirField, summarizeAction } from "./mirActionSpec";
import useMirOptions from "./useMirOptions";

const TIME_FORMAT = "HH:mm:ss";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.md};
`;

const ParamBox = styled.div`
  border: 1px solid ${c.border};
  background: ${c.bg};
  padding: ${space.md};
  display: flex;
  flex-direction: column;
  gap: ${space.sm};

  .ant-form-item {
    margin-bottom: 0;
  }
`;

const ParamHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.sm};
`;

const GearButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  background: ${({ $active }) => ($active ? c.accent : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? c.accent : c.border)};
  color: ${({ $active }) => ($active ? c.onAccent : c.textMuted)};

  &:hover {
    border-color: ${c.borderStrong};
    color: ${({ $active }) => ($active ? c.onAccent : c.text)};
  }
`;

const VariableChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${space.sm};
  padding: 6px ${space.md};
  cursor: pointer;
  font-family: ${font.mono};
  font-size: ${font.sm};
  background: ${c.bgSubtle};
  border: 1px dashed ${c.borderStrong};
  color: ${c.text};

  &:hover {
    background: ${c.bgMuted};
  }
`;

const PopBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  width: 220px;
`;

const PopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.sm};
`;

/**
 * 一個參數欄位的外框,附帶「改用變數」的開關。
 * 開了之後這個欄位派發時會用變數名稱,而不是固定值。
 */
const ParamField: FC<{
  fieldName: string;
  label: string;
  hint?: string;
  children: ReactNode;
}> = ({ fieldName, label, hint, children }) => {
  const { enabled, name, setVariable } = useMirVariableField(fieldName);
  const [open, setOpen] = useState(false);

  return (
    <ParamBox>
      <ParamHead>
        <FieldLabel>{label}</FieldLabel>
        <Popover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="bottomRight"
          content={
            <PopBody>
              <PopRow>
                <FieldLabel>使用變數</FieldLabel>
                <Switch
                  checked={enabled}
                  onChange={(checked) => {
                    setVariable(checked, name);
                    if (!checked) setOpen(false);
                  }}
                />
              </PopRow>
              <PopRow>
                <FieldLabel>變數名稱</FieldLabel>
                <Input
                  size="small"
                  disabled={!enabled}
                  value={name}
                  placeholder="variable name"
                  onChange={(e) => setVariable(enabled, e.target.value)}
                />
              </PopRow>
            </PopBody>
          }
        >
          <GearButton type="button" $active={enabled}>
            <SettingOutlined />
          </GearButton>
        </Popover>
      </ParamHead>

      {enabled ? (
        <VariableChip type="button" onClick={() => setOpen(true)}>
          <SettingOutlined />
          {name || "(未命名變數)"}
        </VariableChip>
      ) : (
        <>
          {children}
          {hint ? <Hint>{hint}</Hint> : null}
        </>
      )}
    </ParamBox>
  );
};

type Props = {
  /**
   * 正在編輯的那張卡。要整張傳進來而不是只傳 operation,因為新增但還沒
   * 存的動作 operation.id 都是空字串,只靠 id 分不出換了哪一張卡。
   */
  slice: { clientId: string; operation: Mir_Action } | null;
  onClose: () => void;
  onSubmit: (next: Mir_Action) => void;
  onDelete: () => void;
};

const MirParamDrawer: FC<Props> = ({ slice, onClose, onSubmit, onDelete }) => {
  const operation = slice?.operation ?? null;
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { locations, markerTypeOptions, bySource } = useMirOptions();
  const { fields: variableFields, setAllFields } = useMirVariableFields();
  const isCurrentPosition = Form.useWatch("is_current_position", form);

  const toTime = (v?: string) =>
    v && dayjs(v, TIME_FORMAT).isValid() ? dayjs(v, TIME_FORMAT) : undefined;

  useEffect(() => {
    if (!operation) return;
    form.setFieldsValue({
      location_id: operation.location_id,
      // location_id 有值就代表不是「目前位置」
      is_current_position: !operation.location_id && !!operation.marker_type,
      entry_position: operation.entry_position,
      footprint: operation.footprint,
      marker_type: operation.marker_type || null,
      blocked_path_timeout: Number(operation.blocked_path_timeout ?? 60),
      blocked_docking_timeout: Number(operation.blocked_docking_timeout ?? 60),
      maximum_linear_speed: Number(operation.maximum_linear_speed ?? 0.25),
      maximum_angular_speed: Number(operation.maximum_angular_speed ?? 0.25),
      distance_threshold: Number(operation.distance_threshold ?? 0.25),
      x: Number(operation.x ?? 0),
      y: Number(operation.y ?? 0),
      orientation: Number(operation.orientation ?? 0),
      collision_detection: operation.collision_detection ?? true,
      wait: toTime(operation.wait),
      sound: operation.sound,
      volume: Number(operation.volume ?? 0),
      front: operation.front ?? "unmuted",
      rear: operation.rear ?? "unmuted",
      sides: operation.sides ?? "unmuted",
      module: operation.module || null,
      port: Number(operation.port ?? 0),
      value: operation.value ?? "on",
      operation: operation.operation ?? "on",
      timeout: toTime(operation.timeout),
    });

    setAllFields(
      Object.fromEntries(
        Object.entries(operation.variables ?? {}).map(([field, name]) => [
          field,
          { enabled: true, name },
        ]),
      ),
    );
    // 只在換一張卡片時重新載入,不要每次輸入都覆寫回去
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slice?.clientId]);

  const submit = async () => {
    if (!operation) return;
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const raw = form.getFieldsValue() as Record<string, unknown>;
    const num = (key: string, fallback: number) =>
      raw[key] === undefined || raw[key] === null || raw[key] === ""
        ? fallback
        : Number(raw[key]);
    const time = (key: string) => {
      const v = raw[key];
      return v && dayjs(v as dayjs.Dayjs).isValid()
        ? dayjs(v as dayjs.Dayjs).format(TIME_FORMAT)
        : "00:00:00";
    };

    onSubmit({
      ...operation,
      location_id: (raw.location_id as string) ?? "",
      entry_position: (raw.entry_position as string) ?? "",
      footprint: (raw.footprint as string) ?? "",
      marker_type: (raw.marker_type as string) ?? "",
      blocked_path_timeout: num("blocked_path_timeout", 60),
      blocked_docking_timeout: num("blocked_docking_timeout", 60),
      maximum_linear_speed: num("maximum_linear_speed", 0.25),
      maximum_angular_speed: num("maximum_angular_speed", 0.25),
      distance_threshold: num("distance_threshold", 0.25),
      x: num("x", 0),
      y: num("y", 0),
      orientation: num("orientation", 0),
      collision_detection: (raw.collision_detection as boolean) ?? true,
      wait: time("wait"),
      sound: (raw.sound as string) ?? "",
      volume: num("volume", 0),
      front: (raw.front as string) ?? "unmuted",
      rear: (raw.rear as string) ?? "unmuted",
      sides: (raw.sides as string) ?? "unmuted",
      module: (raw.module as string) ?? "",
      port: num("port", 0),
      value: (raw.value as string) ?? "on",
      operation: (raw.operation as string) ?? "on",
      timeout: time("timeout"),
      variables: Object.fromEntries(
        Object.entries(variableFields)
          .filter(([, v]) => v.enabled && v.name)
          .map(([field, v]) => [field, v.name]),
      ),
    });
  };

  const renderField = (field: MirField) => {
    if (field.kind === "location") {
      return (
        <ParamField key={field.name} fieldName={field.name} label={field.label}>
          <Form.Item
            name="location_id"
            dependencies={["is_current_position"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  if (getFieldValue("is_current_position")) {
                    return value
                      ? Promise.reject(
                          new Error("已選「目前位置」,這裡要留空"),
                        )
                      : Promise.resolve();
                  }
                  return value
                    ? Promise.resolve()
                    : Promise.reject(new Error("請選一個點位"));
                },
              }),
            ]}
          >
            <Select
              options={locations}
              style={{ width: "100%" }}
              allowClear
              placeholder={t("utils.select")}
              disabled={!!isCurrentPosition}
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
            />
          </Form.Item>

          <PopRow>
            <FieldLabel>Current position</FieldLabel>
            <Form.Item
              name="is_current_position"
              valuePropName="checked"
              initialValue={false}
              noStyle
            >
              <Switch
                onChange={(checked) => {
                  // 兩個欄位互斥:選了目前位置就不填點位,反之不填 marker type
                  form.setFieldValue(
                    checked ? "location_id" : "marker_type",
                    null,
                  );
                  void form
                    .validateFields(["location_id", "marker_type"])
                    .catch(() => undefined);
                }}
              />
            </Form.Item>
          </PopRow>
          <Hint>開啟「Current position」代表在車輛目前的位置對接。</Hint>
        </ParamField>
      );
    }

    if (field.kind === "markerType") {
      return (
        <ParamField key={field.name} fieldName={field.name} label={field.label}>
          <Form.Item
            name="marker_type"
            dependencies={["is_current_position"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  const current = getFieldValue("is_current_position");
                  if (current && !value) {
                    return Promise.reject(new Error("請選一個 marker type"));
                  }
                  if (!current && value) {
                    return Promise.reject(
                      new Error("沒有開「目前位置」,這裡要留空"),
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Select
              options={markerTypeOptions}
              style={{ width: "100%" }}
              allowClear
              placeholder={t("utils.select")}
              disabled={!isCurrentPosition}
            />
          </Form.Item>
        </ParamField>
      );
    }

    if (
      (field.visible === "notCurrentPosition" && isCurrentPosition) ||
      (field.visible === "currentPosition" && !isCurrentPosition)
    ) {
      return null;
    }

    const control = (() => {
      switch (field.kind) {
        case "number":
          return (
            <InputNumber
              min={field.min}
              max={field.max}
              step={field.step}
              style={{ width: "100%" }}
            />
          );
        case "switch":
          return <Switch />;
        case "select":
          return (
            <Select options={field.options} style={{ width: "100%" }} />
          );
        case "optionSelect":
          return (
            <Select
              options={bySource(field.source)}
              style={{ width: "100%" }}
              allowClear
              placeholder={t("utils.select")}
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
            />
          );
        case "time":
          return (
            <TimePicker
              style={{ width: "100%" }}
              defaultOpenValue={dayjs("00:00:00", TIME_FORMAT)}
            />
          );
      }
    })();

    return (
      <ParamField
        key={field.name}
        fieldName={field.name}
        label={field.label}
        hint={field.hint}
      >
        <Form.Item
          name={field.name}
          valuePropName={field.kind === "switch" ? "checked" : undefined}
        >
          {control}
        </Form.Item>
      </ParamField>
    );
  };

  const fields = operation ? (ACTION_FIELDS[operation.type] ?? []) : [];

  return (
    <Drawer
      open={!!operation}
      onClose={onClose}
      width={460}
      destroyOnHidden
      title={operation ? summarizeAction(operation).verb : ""}
    >
      {operation ? (
        <Stack>
          {fields.length === 0 ? (
            <Hint>這個動作沒有參數可以設定,直接儲存即可。</Hint>
          ) : (
            <Form form={form} layout="vertical">
              <Stack>{fields.map(renderField)}</Stack>
            </Form>
          )}

          <Toolbar>
            <SolidButton type="button" onClick={() => void submit()}>
              {t("utils.confirm")}
            </SolidButton>
            <GhostButton type="button" onClick={onClose}>
              {t("utils.cancel")}
            </GhostButton>
            <span style={{ flex: 1 }} />
            <Popconfirm
              title={t("utils.delete_warn")}
              okText={t("utils.confirm")}
              cancelText={t("utils.cancel")}
              onConfirm={onDelete}
            >
              <DangerButton type="button">{t("utils.delete")}</DangerButton>
            </Popconfirm>
          </Toolbar>

          <Hint>
            這裡只改本地暫存,要按上面工具列的「儲存」才會真的寫進後端。
          </Hint>
        </Stack>
      ) : null}
    </Drawer>
  );
};

export default MirParamDrawer;
