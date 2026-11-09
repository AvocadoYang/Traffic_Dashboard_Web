import { FC, useMemo } from "react";
import { Form, InputNumber, Select } from "antd";
import type { FormInstance } from "antd";
import { useTranslation } from "react-i18next";
import {
  SignalCondition,
  SignalRef,
  isRefComplete,
  useSignalSources,
} from "@/api/useSignalSources";
import { Field, FieldGrid, FieldLabel, Hint } from "../../../../ui/primitives";
import {
  ConditionListField,
  NoSignalSourcesHint,
  SignalRefInput,
  SignalRow,
  SignalStack,
} from "../../../../ui/signalFields";

/**
 * 周邊設備步驟的「寫訊號」「等訊號」欄位。值放在表單的 peripheral_action_signal 底下
 * ({ write } / { wait }), 存檔時原樣送給後端 (parseStepSignal 檢查)。
 */

export const SIGNAL_FIELD = "peripheral_action_signal";

export const WriteSignalFields: FC<{ form: FormInstance }> = ({ form }) => {
  const { t } = useTranslation();
  const { data: sources } = useSignalSources();
  const action = Form.useWatch([SIGNAL_FIELD, "write", "action"], form);

  return (
    <SignalStack>
      <NoSignalSourcesHint sources={sources} />
      <Field as="div">
        <FieldLabel>{t("setting_v2.mission.signal.write_target")}</FieldLabel>
        <SignalRow>
          <Form.Item name={[SIGNAL_FIELD, "write", "target"]} noStyle>
            <SignalRefInput side="do" sources={sources} />
          </Form.Item>
        </SignalRow>
      </Field>
      <FieldGrid $cols={2}>
        <Field as="div">
          <FieldLabel>{t("setting_v2.mission.signal.write_action")}</FieldLabel>
          <Form.Item name={[SIGNAL_FIELD, "write", "action"]} noStyle>
            <Select
              style={{ width: "100%" }}
              options={[
                { value: "ON", label: "ON" },
                { value: "OFF", label: "OFF" },
                { value: "PULSE", label: t("setting_v2.mission.signal.pulse") },
              ]}
            />
          </Form.Item>
        </Field>
        {action === "PULSE" && (
          <Field as="div">
            <FieldLabel>{t("setting_v2.mission.signal.pulse_ms")}</FieldLabel>
            <Form.Item name={[SIGNAL_FIELD, "write", "pulseMs"]} noStyle>
              <InputNumber min={50} max={60000} step={100} precision={0} style={{ width: "100%" }} />
            </Form.Item>
          </Field>
        )}
      </FieldGrid>
      <Hint style={{ margin: 0 }}>{t("setting_v2.mission.signal.write_hint")}</Hint>
    </SignalStack>
  );
};

export const WaitSignalFields: FC<{ form: FormInstance }> = ({ form }) => {
  const { t } = useTranslation();
  const { data: sources } = useSignalSources();
  const conditions = Form.useWatch([SIGNAL_FIELD, "wait", "conditions"], form) as
    | SignalCondition[]
    | undefined;
  const count = conditions?.length ?? 0;

  const timeoutOptions = useMemo(
    () => [
      { value: "alarm", label: t("setting_v2.mission.signal.timeout_alarm") },
      { value: "cancel", label: t("setting_v2.mission.signal.timeout_cancel") },
      { value: "continue", label: t("setting_v2.mission.signal.timeout_continue") },
    ],
    [t],
  );

  return (
    <SignalStack>
      <NoSignalSourcesHint sources={sources} />
      <Field as="div">
        <FieldLabel>{t("setting_v2.mission.signal.conditions")}</FieldLabel>
        <ConditionListField name={[SIGNAL_FIELD, "wait", "conditions"]} sources={sources} />
      </Field>
      <FieldGrid $cols={2}>
        {count > 1 && (
          <Field as="div">
            <FieldLabel>{t("setting_v2.mission.signal.match")}</FieldLabel>
            <Form.Item name={[SIGNAL_FIELD, "wait", "match"]} noStyle>
              <Select
                style={{ width: "100%" }}
                options={[
                  { value: "all", label: t("setting_v2.mission.signal.match_all") },
                  { value: "any", label: t("setting_v2.mission.signal.match_any") },
                ]}
              />
            </Form.Item>
          </Field>
        )}
        <Field as="div">
          <FieldLabel>{t("setting_v2.mission.signal.hold_sec")}</FieldLabel>
          <Form.Item name={[SIGNAL_FIELD, "wait", "holdSec"]} noStyle>
            <InputNumber min={0} max={86400} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Hint style={{ margin: 0 }}>{t("setting_v2.mission.signal.hold_hint")}</Hint>
        </Field>
        <Field as="div">
          <FieldLabel>{t("setting_v2.mission.signal.timeout_sec")}</FieldLabel>
          <Form.Item name={[SIGNAL_FIELD, "wait", "timeoutSec"]} noStyle>
            <InputNumber min={0} max={86400} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Hint style={{ margin: 0 }}>{t("setting_v2.mission.signal.timeout_hint")}</Hint>
        </Field>
        <Field as="div">
          <FieldLabel>{t("setting_v2.mission.signal.on_timeout")}</FieldLabel>
          <Form.Item name={[SIGNAL_FIELD, "wait", "onTimeout"]} noStyle>
            <Select style={{ width: "100%" }} options={timeoutOptions} />
          </Form.Item>
        </Field>
      </FieldGrid>
      <Hint style={{ margin: 0 }}>{t("setting_v2.mission.signal.wait_hint")}</Hint>
    </SignalStack>
  );
};

/** 送出前的提示: 訊號點都選好了沒 */
export const isSignalConfigComplete = (
  type: string,
  signal:
    | { write?: { target?: Partial<SignalRef> }; wait?: { conditions?: Partial<SignalRef>[] } }
    | undefined,
) => {
  if (type === "WRITE_SIGNAL") return isRefComplete(signal?.write?.target);
  if (type === "WAIT_SIGNAL") {
    const list = signal?.wait?.conditions ?? [];
    return list.length > 0 && list.every((r) => isRefComplete(r));
  }
  return true;
};
