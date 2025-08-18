import {
  Button,
  Col,
  Form,
  InputNumber,
  message,
  Row,
  Select,
  Switch,
} from "antd";
import { FC, useRef } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";

const flexOption = [
  { value: "row", label: "row" },
  { value: "column", label: "column" },
  { value: "row-reverse", label: "row-reverse" },
  { value: "column-reverse", label: "column-reverse" },
];

const Wrapper = styled.div`
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
`;

const StyledButton = styled(Button)`
  margin-top: 16px;
  width: 100%;
`;

export type SubmitValue = {
  loc: number;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
};

const SettingMultiStyleForm: FC<{ locations: string[] }> = ({ locations }) => {
  const [form] = Form.useForm();
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const submitMutation = useMutation({
    mutationFn: (payload: SubmitValue) =>
      client.post(
        "api/peripherals/edit-multi-peripheral-station-style",
        payload,
      ),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["loc-only"],
      });
      await queryClient.refetchQueries({ queryKey: ["peripheral-style"] });
      void messageApi.success(t("utils.success"));
    },
    onError: () => {
      void messageApi.error("無法排除，請聯絡 FAE 工程師");
    },
  });

  const onFinish = (values: any) => {
    submitMutation.mutate({
      ...values,
      locations,
    });
  };

  return (
    <>
      {contextHolder}
      <Wrapper>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t("multiStyle.editX")}
                name="isEditTranslateX"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item label={t("multiStyle.x")} name="translateX">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t("multiStyle.editY")}
                name="isEditTranslateY"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item label={t("multiStyle.y")} name="translateY">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t("multiStyle.editScale")}
                name="isEditScale"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item label={t("multiStyle.scale")} name="scale">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t("multiStyle.editRotate")}
                name="isEditRotate"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item label={t("multiStyle.rotate")} name="rotate">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t("multiStyle.editDirection")}
            name="isEditDirection"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label={t("multiStyle.flexDirection")}
            name="flex_direction"
          >
            <Select
              options={flexOption}
              placeholder={t("multiStyle.selectDirection")}
            />
          </Form.Item>

          <StyledButton type="primary" htmlType="submit">
            {t("utils.submit")}
          </StyledButton>
        </Form>
      </Wrapper>
    </>
  );
};

export default SettingMultiStyleForm;
