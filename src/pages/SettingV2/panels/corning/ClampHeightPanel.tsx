import { FC, useEffect } from "react";
import { Form, InputNumber, Skeleton, message } from "antd";
import { ColumnHeightOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useCrate from "@/api/useCrate";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  Hint,
} from "../../ui/primitives";

/**
 * 康寧專用:各種箱型對應的夾具線高。
 * v1 對應 formComponent/forms/file/corning/ClampHeightPanel。
 *
 * 欄位名稱就是後端的 key(送出去時會被展開成 changes: [{ name, value }]),
 * 所以這份清單不能隨便改名,只有顯示用的 label 可以調。
 */
const CRATE_FIELDS = [
  { name: "6-Metal", label: "6 Metal" },
  { name: "5", label: "5" },
  { name: "6-Inno", label: "6 Inno" },
  { name: "6-Wooden", label: "6 Wooden" },
  { name: "6-KC", label: "6 KC" },
  { name: "5.5", label: "5.5" },
  { name: "Pallet", label: "Pallet" },
] as const;

const ClampHeightPanel: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCrate();

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue(
      Object.fromEntries(
        CRATE_FIELDS.map(({ name }) => [
          name,
          (data as Record<string, number>)[name],
        ]),
      ),
    );
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: { changes: { name: string; value: number }[] }) =>
      client.post("api/corning/edit_crate", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.refetchQueries({ queryKey: ["crate"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const raw = form.getFieldsValue() as Record<string, number>;
    saveMutation.mutate({
      changes: CRATE_FIELDS.map(({ name }) => ({ name, value: raw[name] })),
    });
  };

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <ColumnHeightOutlined />
          夾具線高
        </SectionTitle>

        <Hint>每種箱型在取放時夾具要停的高度。</Hint>

        <Form form={form} autoComplete="off" layout="vertical">
          <FieldGrid $cols={2}>
            {CRATE_FIELDS.map(({ name, label }) => (
              <Field key={name}>
                <FieldLabel>{label}</FieldLabel>
                <Form.Item name={name} rules={[{ required: true }]} noStyle>
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Field>
            ))}
          </FieldGrid>
        </Form>

        <Toolbar>
          <SolidButton
            type="button"
            disabled={saveMutation.isLoading}
            onClick={() => void submit()}
          >
            {saveMutation.isLoading ? t("utils.loading") : t("utils.save")}
          </SolidButton>
        </Toolbar>
      </Section>
    </PanelShell>
  );
};

export default ClampHeightPanel;
