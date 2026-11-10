import { FC } from "react";
import { AutoComplete, Form, InputNumber, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  SignalCondition,
  SignalRef,
  SignalSources,
  SignalSource,
  readSignal,
} from "@/api/useSignalSources";
import { c, font, space } from "./tokens";
import { GhostButton, Hint } from "./primitives";

/**
 * 設備訊號的共用欄位 (任務步驟的寫訊號 / 等訊號、訊號觸發任務):
 * 選一個訊號點 (研華模組 / 訊號程式 + 點位), 旁邊顯示現在的值。
 */

export const MAX_SIGNAL_CONDITIONS = 8;

export const SignalRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.sm};
  border: 1px solid ${c.border};
  background: ${c.bgSubtle};
`;

export const SignalStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
`;

/** 現在的值: ON = 實心, OFF = 空心, 不明 = 虛線 (灰黑白, 不用紅綠) */
export const SignalLive = styled.span<{ $on: boolean | null }>`
  font-family: ${font.mono};
  font-size: ${font.xs};
  padding: 1px 6px;
  border: 1px ${({ $on }) => ($on === null ? "dashed" : "solid")} ${c.borderStrong};
  background: ${({ $on }) => ($on ? c.accent : "transparent")};
  color: ${({ $on }) => ($on ? c.onAccent : c.textSecondary)};
  white-space: nowrap;
`;

type RefValue = Partial<SignalRef> & { expect?: boolean };

const pointLabel = (
  side: "di" | "do",
  p: { index: number; code: string; name: string },
) => {
  const label = [p.code, p.name].filter((s) => s && s.trim()).join(" ");
  return `${side.toUpperCase()}${p.index}${label ? ` ${label}` : ""}`;
};

const BLANK_POINTS = [0, 1, 2, 3].map((i) => ({
  index: i,
  code: "",
  name: "",
  value: null,
}));

/** 一個訊號點的文字, 例如「電梯A DI0 FALL 電梯故障」「wise_31 #3」 */
export const describeSignal = (
  ref: Partial<SignalRef>,
  side: "di" | "do",
  sources: SignalSources | undefined,
  t: TFunction,
) => {
  if (!ref.module) return "-";
  if (ref.source === "advantech") {
    const m = sources?.advantech.find((x) => x.id === ref.module);
    const name = m?.name ?? t("setting_v2.mission.signal.deleted_module");
    const p = m?.[side]?.[ref.channel ?? 0] ?? BLANK_POINTS[ref.channel ?? 0];
    return `${name} ${pointLabel(side, p ?? { index: ref.channel ?? 0, code: "", name: "" })}`;
  }
  return `${ref.module} #${ref.channel ?? 0}`;
};

/** 一個條件的文字, 例如「電梯A DI0 = ON」 */
export const describeCondition = (
  cond: Partial<SignalCondition>,
  sources: SignalSources | undefined,
  t: TFunction,
) => `${describeSignal(cond, "di", sources, t)} = ${cond.expect === false ? "OFF" : "ON"}`;

/** 一個訊號點: 來源 + 模組 + 點位 (+ 要 ON / OFF), 旁邊顯示現在的值 */
export const SignalRefInput: FC<{
  value?: RefValue;
  onChange?: (v: RefValue) => void;
  side: "di" | "do";
  withExpect?: boolean;
  sources?: SignalSources;
}> = ({ value, onChange, side, withExpect, sources }) => {
  const { t } = useTranslation();
  const v: RefValue = value ?? { source: "advantech", module: "", channel: 0 };
  const source: SignalSource = v.source ?? "advantech";
  const set = (patch: RefValue) => onChange?.({ ...v, ...patch });

  const advantech = sources?.advantech ?? [];
  const remote = sources?.remote ?? [];
  const module = advantech.find((m) => m.id === v.module);
  const live = readSignal(sources, v, side);

  const moduleOptions = advantech.map((m) => ({
    value: m.id,
    label: `${m.name}${m.group ? ` · ${m.group}` : ""}${
      m.connected ? "" : ` (${t("setting_v2.mission.signal.offline")})`
    }`,
  }));
  // 存過的模組被刪掉了: 還是列出來, 不然選單會顯示一串 id
  if (source === "advantech" && v.module && !module) {
    moduleOptions.push({
      value: v.module,
      label: t("setting_v2.mission.signal.deleted_module"),
    });
  }

  return (
    <>
      <Select<SignalSource>
        size="small"
        value={source}
        style={{ width: 110 }}
        onChange={(s) => set({ source: s, module: "", channel: 0 })}
        options={[
          { value: "advantech", label: t("setting_v2.mission.signal.source_advantech") },
          { value: "remote_io", label: t("setting_v2.mission.signal.source_remote") },
        ]}
      />
      {source === "advantech" ? (
        <>
          <Select
            size="small"
            showSearch
            optionFilterProp="label"
            value={v.module || undefined}
            placeholder={t("setting_v2.mission.signal.module_placeholder")}
            style={{ minWidth: 160 }}
            onChange={(m) => set({ module: m, channel: 0 })}
            options={moduleOptions}
            notFoundContent={t("setting_v2.mission.signal.no_advantech")}
          />
          <Select<number>
            size="small"
            value={v.channel ?? 0}
            style={{ minWidth: 130 }}
            onChange={(ch) => set({ channel: ch })}
            options={(module?.[side] ?? BLANK_POINTS).map((p) => ({
              value: p.index,
              label: pointLabel(side, p),
            }))}
          />
        </>
      ) : (
        <>
          <AutoComplete
            size="small"
            value={v.module || ""}
            placeholder={t("setting_v2.mission.signal.remote_placeholder")}
            style={{ minWidth: 160 }}
            onChange={(m: string) => set({ module: m.trim() })}
            options={remote.map((m) => ({
              value: m.module,
              label: `${m.module}${
                m.alive ? "" : ` (${t("setting_v2.mission.signal.offline")})`
              }`,
            }))}
            filterOption={(input, option) =>
              String(option?.value ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
          <InputNumber
            size="small"
            min={0}
            max={65535}
            precision={0}
            value={v.channel ?? 0}
            addonBefore={t("setting_v2.mission.signal.point")}
            style={{ width: 130 }}
            onChange={(ch) => set({ channel: typeof ch === "number" ? ch : 0 })}
          />
        </>
      )}
      {withExpect && (
        // antd 的 Select 值只能是字串 / 數字, 存的是 boolean
        <Select<"on" | "off">
          size="small"
          value={v.expect === false ? "off" : "on"}
          style={{ width: 96 }}
          onChange={(e) => set({ expect: e === "on" })}
          options={[
            { value: "on", label: t("setting_v2.mission.signal.expect_on") },
            { value: "off", label: t("setting_v2.mission.signal.expect_off") },
          ]}
        />
      )}
      <SignalLive $on={live}>
        {`${t("setting_v2.mission.signal.now")} ${
          live === null ? t("setting_v2.mission.signal.unknown") : live ? "ON" : "OFF"
        }`}
      </SignalLive>
    </>
  );
};

/** 條件清單 (Form.List): 每列一個輸入點 + 要 ON / OFF, 最多 8 個 */
export const ConditionListField: FC<{
  name: (string | number)[] | string;
  sources?: SignalSources;
}> = ({ name, sources }) => {
  const { t } = useTranslation();
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <SignalStack>
          {fields.map((field) => (
            <SignalRow key={field.key}>
              <Form.Item name={field.name} noStyle>
                <SignalRefInput side="di" withExpect sources={sources} />
              </Form.Item>
              <span style={{ flex: 1 }} />
              {fields.length > 1 && (
                <GhostButton
                  type="button"
                  onClick={() => remove(field.name)}
                  aria-label={t("setting_v2.mission.signal.remove")}
                >
                  <DeleteOutlined />
                </GhostButton>
              )}
            </SignalRow>
          ))}
          {fields.length < MAX_SIGNAL_CONDITIONS && (
            <div>
              <GhostButton
                type="button"
                onClick={() =>
                  add({ source: "advantech", module: "", channel: 0, expect: true })
                }
              >
                <PlusOutlined />
                {t("setting_v2.mission.signal.add_condition")}
              </GhostButton>
            </div>
          )}
        </SignalStack>
      )}
    </Form.List>
  );
};

/** 沒有任何訊號來源時的說明 */
export const NoSignalSourcesHint: FC<{ sources?: SignalSources }> = ({ sources }) => {
  const { t } = useTranslation();
  if (!sources || sources.advantech.length > 0 || sources.remote.length > 0) {
    return null;
  }
  return <Hint style={{ margin: 0 }}>{t("setting_v2.mission.signal.no_sources")}</Hint>;
};
