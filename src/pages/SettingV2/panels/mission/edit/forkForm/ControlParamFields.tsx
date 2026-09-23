import { FC } from "react";
import { Form, InputNumber, Select, Switch } from "antd";
import type { FormInstance } from "antd";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import SegmentedControl from "../../../../ui/SegmentedControl";
import { c, font, space } from "../../../../ui/tokens";
import { Hint } from "../../../../ui/primitives";
import { OrderBadge } from "../steps/stepPrimitives";
import {
  CONTROL_FIELDS,
  ControlField,
  controlLabel,
  hasControlFields,
} from "./controlSpec";

type LocationOption = { label: string; value: string };

/** 超出範圍時要顯示什麼。沒特別寫的話就照 min / max 組一句出來 */
const rangeMessage = (min?: number, max?: number, note?: string): string => {
  if (note) return note;
  if (min !== undefined && max !== undefined) return `${min} ~ ${max}`;
  if (min !== undefined) return `>= ${min}`;
  if (max !== undefined) return `<= ${max}`;
  return "";
};

const Group = styled.div`
  border: 1px solid ${c.border};
  background: ${c.bg};
`;

const GroupHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.sm} ${space.md};
  background: ${c.bgSubtle};
  border-bottom: 1px solid ${c.border};
  font-size: ${font.xs};
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${c.textSecondary};
`;

const GroupBody = styled.div`
  padding: ${space.md};

  /* && 是為了蓋過外層 FormShell 把 margin 歸零的那條規則 */
  && .ant-form-item {
    margin-bottom: ${space.md};
  }
  && .ant-form-item:last-child {
    margin-bottom: 0;
  }
`;

const ItemLabel = styled.span<{ $required?: boolean }>`
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${c.textMuted};

  &::after {
    content: ${({ $required }) => ($required ? '" *"' : '""')};
    color: ${c.textSecondary};
  }
`;

type Props = {
  /** 使用者排好的控制項順序。索引就是 io.fork 的 key */
  controlSequence: string[];
  form: FormInstance;
  locationOptions: LocationOption[];
};

const ControlParamFields: FC<Props> = ({
  controlSequence,
  form,
  locationOptions,
}) => {
  const { t } = useTranslation();

  const locationSelect = (
    <Select
      options={locationOptions}
      placeholder={t("utils.select")}
      style={{ width: "100%" }}
      showSearch={{
        filterOption: (input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
      }}
    />
  );

  const renderField = (
    field: ControlField,
    base: (string | number)[],
    key: string,
  ) => {
    if (field.kind === "exclusive-locations") {
      // 兩個欄位互斥,任一邊有值就把另一邊鎖起來,兩邊都空則兩邊都報錯
      return (
        <Form.Item key={key} noStyle shouldUpdate>
          {() => {
            const firstName = [...base, ...field.first.path];
            const secondName = [...base, ...field.second.path];
            const firstValue = form.getFieldValue(firstName);
            const secondValue = form.getFieldValue(secondName);
            const bothEmpty = !firstValue && !secondValue;
            const rules = [
              {
                validator: () =>
                  bothEmpty ? Promise.reject(field.note) : Promise.resolve(),
              },
            ];

            return (
              <>
                {[
                  { side: field.first, name: firstName, other: secondName, lock: !!secondValue },
                  { side: field.second, name: secondName, other: firstName, lock: !!firstValue },
                ].map(({ side, name, other, lock }) => (
                  <Form.Item
                    key={side.label}
                    label={<ItemLabel>{side.label}</ItemLabel>}
                    name={name}
                    rules={rules}
                  >
                    <Select
                      options={locationOptions}
                      placeholder={t("utils.select")}
                      style={{ width: "100%" }}
                      disabled={lock}
                      allowClear
                      showSearch={{
                        filterOption: (input, option) =>
                          (option?.label ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase()),
                      }}
                      onChange={() => form.setFieldValue(other, undefined)}
                    />
                  </Form.Item>
                ))}
                <Hint>{field.note}</Hint>
              </>
            );
          }}
        </Form.Item>
      );
    }

    const name = [...base, ...field.path];
    const label = <ItemLabel $required={field.required}>{field.label}</ItemLabel>;
    const rules = field.required
      ? [{ required: true, message: t("utils.required") }]
      : undefined;
    // extraKey 是執行期才知道的字串,i18next 的 key 型別推不出來,
    // 這裡明確收斂成 string
    const extra = field.extraKey
      ? (t(field.extraKey as Parameters<typeof t>[0]) as string)
      : undefined;

    const item = (() => {
      switch (field.kind) {
        case "segment":
          return (
            <Form.Item key={key} label={label} name={name} rules={rules}>
              <SegmentedControl options={field.options} />
            </Form.Item>
          );
        case "switch":
          return (
            <Form.Item key={key} label={label} name={name} valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
          );
        case "location":
          return (
            <Form.Item key={key} label={label} name={name} rules={rules}>
              {locationSelect}
            </Form.Item>
          );
        case "number":
          return (
            <Form.Item
              key={key}
              label={label}
              name={name}
              rules={
                field.min !== undefined || field.max !== undefined
                  ? [
                      ...(rules ?? []),
                      {
                        type: "number" as const,
                        min: field.min,
                        max: field.max,
                        message: rangeMessage(field.min, field.max, field.rangeNote),
                      },
                    ]
                  : rules
              }
              extra={
                field.rangeNote ? (
                  <Hint>{field.rangeNote}</Hint>
                ) : (
                  extra && <Hint>{extra}</Hint>
                )
              }
            >
              <InputNumber
                min={field.min}
                max={field.max}
                step={field.step}
                addonAfter={field.unit}
                style={{ width: "100%" }}
              />
            </Form.Item>
          );
      }
    })();

    if (!field.showWhen) return item;

    // 顯示條件看的是同一個控制項裡另一個欄位的值
    const { path, values, orPrefix } = field.showWhen;
    return (
      <Form.Item key={`${key}-when`} noStyle shouldUpdate>
        {() => {
          const current = form.getFieldValue([...base, ...path]) as
            | string
            | undefined;
          const visible =
            !!current &&
            (values.includes(current) ||
              (!!orPrefix && current.startsWith(orPrefix)));
          return visible ? item : null;
        }}
      </Form.Item>
    );
  };

  const withFields = controlSequence
    .map((control, index) => ({ control, index }))
    .filter(({ control }) => hasControlFields(control));

  if (withFields.length === 0) return null;

  return (
    <>
      {withFields.map(({ control, index }) => {
        const base = ["io", "fork", index.toString()];
        return (
          <Group key={`${control}-${index}`}>
            <GroupHead>
              <OrderBadge>{index + 1}</OrderBadge>
              {controlLabel(control)}
            </GroupHead>
            <GroupBody>
              {CONTROL_FIELDS[control].map((field, i) =>
                renderField(field, base, `${control}-${index}-${i}`),
              )}
            </GroupBody>
          </Group>
        );
      })}
    </>
  );
};

export default ControlParamFields;
