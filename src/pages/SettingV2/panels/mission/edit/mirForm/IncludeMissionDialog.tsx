import { FC, ReactNode, useEffect, useRef, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  TimePicker,
} from "antd";
import dayjs from "dayjs";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import type { MirTitleVariable } from "@/api/useMirMissionTitleVariables";
import { c, font, space } from "../../../../ui/tokens";
import { Field, FieldLabel, Hint } from "../../../../ui/primitives";
import { IncludeGroup, IncludeMissionSelect } from "../steps/includeMission";
import { ACTION_FIELDS, MirField } from "./mirActionSpec";
import useMirOptions from "./useMirOptions";

const TIME_FORMAT = "HH:mm:ss";

export type IncludeVariableValue = string | number | boolean;
export type IncludeVariables = Record<string, IncludeVariableValue>;

export type IncludeDialogTarget = {
  clientId: string | null;
  includeTitleId?: string;
  values: IncludeVariables;
} | null;

const VarBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
  padding: ${space.sm} ${space.md};
  border: 1px solid ${c.border};
  background: ${c.bgSubtle};
`;

const VarName = styled.span`
  font-family: ${font.mono};
  font-weight: 700;
`;

const UsedBy = styled.span`
  font-family: ${font.mono};
  font-size: ${font.xs};
  color: ${c.textMuted};
`;

const fieldOf = (variable: MirTitleVariable): MirField | undefined => {
  for (const actionType of variable.slice_types) {
    const spec = ACTION_FIELDS[actionType]?.find((f) =>
      variable.fields.includes(f.name),
    );
    if (spec) return spec;
  }
  return undefined;
};

const isTimeKind = (spec?: MirField) =>
  spec?.kind === "time" || spec?.kind === "duration";

const toFormValue = (spec: MirField | undefined, v?: IncludeVariableValue) => {
  if (v === undefined) return undefined;
  if (isTimeKind(spec) && typeof v === "string") {
    const d = dayjs(v.split(".")[0], TIME_FORMAT);
    return d.isValid() ? d : undefined;
  }
  return v;
};

const fromFormValue = (
  spec: MirField | undefined,
  v: unknown,
): IncludeVariableValue | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (isTimeKind(spec)) {
    const d = dayjs(v as dayjs.Dayjs);
    if (!d.isValid()) return undefined;
    return spec?.kind === "duration"
      ? `${d.format(TIME_FORMAT)}.000000`
      : d.format(TIME_FORMAT);
  }
  return v as IncludeVariableValue;
};

type Props = {
  target: IncludeDialogTarget;
  groups: IncludeGroup[];
  /** 查某個任務的變數(有快取就直接回) */
  fetchVariables: (missionTitleId: string) => Promise<MirTitleVariable[]>;
  onOk: (includeTitleId: string, values: IncludeVariables) => void;
  onCancel: () => void;
};

const IncludeMissionDialog: FC<Props> = ({
  target,
  groups,
  fetchVariables,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [pick, setPick] = useState<string>();
  const { locations, markerTypeOptions, bySource } = useMirOptions();

  const [variables, setVariables] = useState<MirTitleVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const latestPick = useRef<string>();

  const loadVariables = (id: string, values: IncludeVariables) => {
    latestPick.current = id;
    setVariables([]);
    setLoadFailed(false);
    setLoading(true);
    form.resetFields();
    fetchVariables(id)
      .then((list) => {
        if (latestPick.current !== id) return;
        setVariables(list);
        form.setFieldsValue({
          vars: Object.fromEntries(
            list.map((v) => [v.name, toFormValue(fieldOf(v), values[v.name])]),
          ),
        });
      })
      .catch(() => {
        if (latestPick.current === id) setLoadFailed(true);
      })
      .finally(() => {
        if (latestPick.current === id) setLoading(false);
      });
  };

  useEffect(() => {
    if (!target) return;
    setPick(target.includeTitleId);
    latestPick.current = target.includeTitleId;
    setVariables([]);
    setLoadFailed(false);
    if (target.includeTitleId) {
      loadVariables(target.includeTitleId, target.values);
    }
  }, [target]);

  const changePick = (id: string) => {
    setPick(id);
    loadVariables(id, {});
  };

  const control = (
    spec: MirField | undefined,
    variable: MirTitleVariable,
  ): ReactNode => {
    const searchable = {
      filterOption: (input: string, option?: { label?: string }) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
    };
    switch (spec?.kind) {
      case "location":
        return (
          <Select options={locations} allowClear showSearch={searchable} />
        );
      case "markerType":
        return <Select options={markerTypeOptions} allowClear />;
      case "number":
        return (
          <InputNumber
            min={spec.min}
            max={spec.max}
            step={spec.step}
            style={{ width: "100%" }}
          />
        );
      case "switch":
        return <Switch />;
      case "select":
        return <Select options={spec.options} allowClear />;
      case "optionSelect":
        return (
          <Select
            options={bySource(spec.source)}
            allowClear
            showSearch={searchable}
          />
        );
      case "time":
      case "duration":
        return (
          <TimePicker
            style={{ width: "100%" }}
            defaultOpenValue={dayjs("00:00:00", TIME_FORMAT)}
          />
        );
    }
    if (variable.is_location || variable.value_type === "location") {
      return <Select options={locations} allowClear showSearch={searchable} />;
    }
    switch (variable.value_type) {
      case "int":
        return <InputNumber precision={0} style={{ width: "100%" }} />;
      case "float":
        return <InputNumber style={{ width: "100%" }} />;
      case "bool":
        return <Switch />;
      default:
        return <Input />;
    }
  };

  const submit = () => {
    if (!pick) return;
    const raw = (form.getFieldValue("vars") ?? {}) as Record<string, unknown>;
    const values: IncludeVariables = {};
    variables.forEach((v) => {
      const value = fromFormValue(fieldOf(v), raw[v.name]);
      if (value !== undefined) values[v.name] = value;
    });
    onOk(pick, values);
  };

  return (
    <Modal
      open={!!target}
      title={
        target?.clientId
          ? t("setting_v2.mission.include_edit")
          : t("setting_v2.mir.include_add")
      }
      onCancel={onCancel}
      onOk={submit}
      okButtonProps={{ disabled: !pick || loading }}
      okText={t("utils.confirm")}
      cancelText={t("utils.cancel")}
      destroyOnHidden
    >
      <Hint style={{ marginBottom: 12 }}>
        {t("setting_v2.mir.include_hint")}
      </Hint>

      <Field>
        <FieldLabel>{t("mission.add_mission.title")}</FieldLabel>
        <IncludeMissionSelect
          groups={groups}
          value={pick}
          onChange={changePick}
        />
      </Field>

      {/* Form 要一直掛著,打開時 setFieldsValue 才接得上 */}
      <Form form={form} layout="vertical" component={false}>
        {loading && <Hint style={{ marginTop: 16 }}>{t("utils.loading")}</Hint>}
        {loadFailed && (
          <Hint style={{ marginTop: 16 }}>
            {t("setting_v2.mir.include_variables_failed")}
          </Hint>
        )}
        {pick && !loading && !loadFailed && variables.length === 0 && (
          <Hint style={{ marginTop: 16 }}>
            {t("setting_v2.mir.include_no_variables")}
          </Hint>
        )}
        {variables.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <FieldLabel>
              {t("setting_v2.mir.include_variables", {
                count: variables.length,
              })}
            </FieldLabel>
            <Hint style={{ marginBottom: 8 }}>
              {t("setting_v2.mir.include_variables_hint")}
            </Hint>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {variables.map((v) => {
                const spec = fieldOf(v);
                return (
                  <VarBox key={v.name}>
                    <VarName>{v.name}</VarName>
                    <UsedBy>
                      {`${v.slice_types.join(", ")} · ${v.fields.join(", ")}`}
                    </UsedBy>
                    <Form.Item
                      name={["vars", v.name]}
                      valuePropName={
                        spec?.kind === "switch" ||
                        (!spec && v.value_type === "bool")
                          ? "checked"
                          : "value"
                      }
                      style={{ marginBottom: 0 }}
                    >
                      {control(spec, v)}
                    </Form.Item>
                  </VarBox>
                );
              })}
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default IncludeMissionDialog;
