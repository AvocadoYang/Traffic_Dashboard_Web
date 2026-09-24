import { FC, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
} from "antd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Cargo } from "@/types/peripheral";
import {
  CargoFormat,
  CargoMetadata,
  FIELD_PRESETS,
  FormatField,
  formatValue,
  parseFormatFields,
  parseMetadata,
} from "./cargoList";

const FormBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);

  .ant-form-item-label > label {
    font-size: 14px;
    font-weight: 600;
    color: var(--c-text);
  }
`;

const UniqueTag = styled.span`
  margin-left: var(--space-sm);
  padding: 0 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-accent);
  background: var(--c-bg-selected);
`;

const ExtraFields = styled.dl`
  margin: 0;
  padding: var(--space-md);
  border-radius: 8px;
  background: var(--c-bg-subtle);
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px var(--space-md);
  font-size: 14px;

  dt {
    color: var(--c-text-secondary);
  }
  dd {
    margin: 0;
    color: var(--c-text);
    word-break: break-all;
  }
`;

const SectionTitle = styled.div`
  margin: var(--space-lg) 0 var(--space-sm);
  font-size: 13px;
  color: var(--c-text-secondary);
`;

const Footer = styled.div`
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--c-border);
  background: var(--c-bg);

  .ant-btn {
    flex: 1;
    height: 48px;
    font-size: 16px;
  }
`;

// 下拉選單的選項預設 32px 高,手指容易點錯行,拉到 44px
const TOUCH_THEME = {
  components: { Select: { optionHeight: 44, optionFontSize: 15 } },
};

const toBooleanValue = (value: unknown) => {
  if (value === true || value === "true") return "true";
  if (value === false || value === "false") return "false";
  return undefined;
};

const initialValuesOf = (fields: FormatField[], metadata: CargoMetadata) =>
  Object.fromEntries(
    fields.map(({ name, type }) => {
      const value = metadata[name];
      if (type === "boolean") return [name, toBooleanValue(value)];
      if (type === "number") {
        const n = typeof value === "number" ? value : Number(value);
        return [
          name,
          value === undefined || value === "" || isNaN(n) ? undefined : n,
        ];
      }
      return [
        name,
        value === undefined || value === null ? undefined : String(value),
      ];
    }),
  );

const CargoForm: FC<{
  mode: "add" | "edit";
  cargo?: Cargo;
  formats: CargoFormat[];
  saving: boolean;
  /** 編輯中的貨已經不在這個點位(例如被車取走) */
  cargoGone: boolean;
  onCancel: () => void;
  onSubmit: (formatId: string, metadata: CargoMetadata) => void;
}> = ({ mode, cargo, formats, saving, cargoGone, onCancel, onSubmit }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  // 打開表單當下的內容。socket 每次更新都會換新物件,
  // 這裡固定住,輸入到一半才不會被即時資料洗掉
  const [original] = useState(() => (cargo ? parseMetadata(cargo) : {}));
  const defaultFormatId =
    cargo?.customCargoMetadataId ??
    formats.find((f) => f.is_default)?.id ??
    formats[0]?.id;
  const [formatId, setFormatId] = useState<string | undefined>(defaultFormatId);

  // 格式清單晚一點才載入時補上預設格式
  useEffect(() => {
    if (!formatId && defaultFormatId) setFormatId(defaultFormatId);
  }, [formatId, defaultFormatId]);

  const format = formats.find((f) => f.id === formatId);
  const formatDefinition = format?.format;
  const fields = useMemo(
    () => parseFormatFields(format),
    // 用格式內容當依據,格式清單重新抓取時不會重置表單
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formatDefinition],
  );
  const extraKeys = Object.keys(original).filter(
    (key) => !fields.some((f) => f.name === key),
  );

  // 換格式時,跟新格式同名的欄位沿用原本的值
  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(initialValuesOf(fields, original));
  }, [fields, original, form]);

  const handleSubmit = async () => {
    if (!formatId) return;
    // 驗證沒過時欄位下方已經有提示,這裡直接結束
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    // 只寫回使用者動過的欄位,沒動的維持原值與原本型別,格式外的欄位也保留
    const metadata: CargoMetadata = { ...original };
    for (const { name, type } of fields) {
      if (mode === "edit" && !form.isFieldTouched(name)) continue;
      const value = values[name];
      if (value === undefined || value === null || value === "") {
        delete metadata[name];
      } else {
        metadata[name] = type === "string" ? String(value).trim() : value;
      }
    }
    onSubmit(formatId, metadata);
  };

  const renderInput = (field: FormatField) => {
    if (field.type === "number") {
      return (
        <InputNumber
          size="large"
          controls={false}
          inputMode="decimal"
          style={{ width: "100%" }}
        />
      );
    }
    if (field.type === "boolean") {
      return (
        <Segmented
          block
          size="large"
          options={[
            { label: t("utils.yes"), value: "true" },
            { label: t("utils.no"), value: "false" },
          ]}
        />
      );
    }
    const presets = FIELD_PRESETS[field.name];
    if (presets) {
      return (
        <Select
          size="large"
          allowClear
          options={presets.map((value) => ({ label: value, value }))}
        />
      );
    }
    return <Input size="large" allowClear />;
  };

  return (
    <>
      <FormBody>
        {cargoGone && (
          <Alert
            type="warning"
            showIcon
            title={t("cargo_panel.cargo_gone")}
            style={{ marginBottom: 16 }}
          />
        )}
        {formats.length === 0 ? (
          <Alert type="info" showIcon title={t("cargo_panel.no_formats")} />
        ) : (
          <ConfigProvider theme={TOUCH_THEME}>
            <Form form={form} layout="vertical" requiredMark={false}>
              <Form.Item label={t("cargo_panel.format")}>
                <Select
                  size="large"
                  value={formatId}
                  onChange={setFormatId}
                  options={formats.map((f) => ({
                    label: f.custom_name,
                    value: f.id,
                  }))}
                />
              </Form.Item>

              {fields.map((field) => {
                const isUnique = field.name === format?.unique_key;
                return (
                  <Form.Item
                    key={`${formatId}-${field.name}`}
                    name={field.name}
                    label={
                      <>
                        {field.name}
                        {isUnique && (
                          <UniqueTag>{t("cargo_panel.unique_key")}</UniqueTag>
                        )}
                      </>
                    }
                    rules={
                      isUnique
                        ? [{ required: true, message: t("utils.required") }]
                        : undefined
                    }
                  >
                    {renderInput(field)}
                  </Form.Item>
                );
              })}

              {extraKeys.length > 0 && (
                <>
                  <SectionTitle>{t("cargo_panel.other_fields")}</SectionTitle>
                  <ExtraFields>
                    {extraKeys.map((key) => (
                      <FragmentRow key={key} name={key} value={original[key]} />
                    ))}
                  </ExtraFields>
                </>
              )}
            </Form>
          </ConfigProvider>
        )}
      </FormBody>
      <Footer>
        <Button size="large" onClick={onCancel}>
          {t("utils.cancel")}
        </Button>
        <Button
          size="large"
          type="primary"
          loading={saving}
          disabled={!formatId || cargoGone || formats.length === 0}
          onClick={handleSubmit}
        >
          {t("utils.save")}
        </Button>
      </Footer>
    </>
  );
};

const FragmentRow: FC<{ name: string; value: unknown }> = ({ name, value }) => (
  <>
    <dt>{name}</dt>
    <dd>{formatValue(value)}</dd>
  </>
);

export default CargoForm;
