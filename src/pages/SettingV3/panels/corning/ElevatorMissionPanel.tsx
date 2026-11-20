import { FC, useEffect } from "react";
import { Form, Switch, Skeleton, message } from "antd";
import { VerticalAlignMiddleOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useElevatorActive from "@/api/useElevatorActive";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import {
  PanelShell,
  Section,
  SectionTitle,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  Hint,
} from "../../ui/primitives";

/**
 * 康寧專用:電梯任務的總開關。
 * v1 對應 formComponent/forms/file/corning/ElevatorMissionPanel。
 */
const ElevatorMissionPanel: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ active: boolean }>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useElevatorActive();

  // 遠端資料回來之後才知道開關的真實狀態,拿到就同步回表單
  useEffect(() => {
    if (data === undefined) return;
    form.setFieldsValue({ active: !!data.is_active });
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      client.post("api/corning/edit-elevator-mission", { isActive }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: ["elevator-active"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <VerticalAlignMiddleOutlined />
          電梯任務
        </SectionTitle>

        <Form form={form} autoComplete="off" layout="vertical">
          <Field>
            <FieldLabel>電梯任務是否啟動</FieldLabel>
            <Form.Item name="active" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </Field>
        </Form>

        <Hint>關掉之後車輛就不會再被派送需要搭電梯的任務。</Hint>

        <Toolbar>
          <SolidButton
            type="button"
            disabled={saveMutation.isLoading}
            onClick={() =>
              saveMutation.mutate(form.getFieldValue("active") as boolean)
            }
          >
            {saveMutation.isLoading ? t("utils.loading") : t("utils.save")}
          </SolidButton>
        </Toolbar>
      </Section>
    </PanelShell>
  );
};

export default ElevatorMissionPanel;
