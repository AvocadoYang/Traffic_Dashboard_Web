import client from "@/api/axiosClient";
import useCrate from "@/api/useCrate";
import FormHr from "@/pages/Setting/utils/FormHr";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Form, InputNumber, message } from "antd";
import React, { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const FieldLabel = styled.span`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #595959;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;

  &:hover {
    background: #fafafa;
    border-color: #8c8c8c;
    color: #262626;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }
`;

const ClampHeightPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { data } = useCrate();
  const [ForkForm] = Form.useForm();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (payload: {
      changes: {
        name: string;
        value: number;
      }[];
    }) => {
      return client.post("api/corning/edit_crate", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["crate"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const onSaveValue = () => {
    const payload = ForkForm.getFieldsValue() as {
      "6-Metal": number;
      "5": number;
      "6-Inno": number;
      "6-Wooden": number;
      "6-KC": number;
      "5.5": number;
      "6-TC": number;
    };

    const changes = Object.entries(payload).map(([key, value]) => {
      return {
        name: key,
        value: value,
      };
    });

    saveMutation.mutate({ changes });
  };

  useEffect(() => {
    if (!data) return;

    ForkForm.setFieldsValue({
      "6-Metal": data["6-Metal"],
      "5": data["5"],
      "6-Inno": data["6-Inno"],
      "6-Wooden": data["6-Wooden"],
      "6-KC": data["6-KC"],
      "5.5": data["5.5"],
      "6-TC": data["6-TC"],
    });
  }, [data, ForkForm]);

  return (
    <>
      {contextHolder}
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          夾具線高
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <Form
            form={ForkForm}
            autoComplete="off"
            size="large"
            variant="outlined"
            layout="vertical"
          >
            <Form.Item
              label={<FieldLabel>"6_Metal"</FieldLabel>}
              name="6-Metal"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>"5"</FieldLabel>}
              name="5"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>"6 Inno"</FieldLabel>}
              name="6-Inno"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>"6 Woode"</FieldLabel>}
              name="6-Wooden"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>"6 KC"</FieldLabel>}
              name="6-KC"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>"5.5"</FieldLabel>}
              name="5.5"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>"6 TC"</FieldLabel>}
              name="6-TC"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <IndustrialButton
              onClick={() => onSaveValue()}
              className="primary"
              htmlType="submit"
            >
              {t("utils.confirm")}
            </IndustrialButton>
          </Form>
        </Flex>
      </div>
    </>
  );
};
export default ClampHeightPanel;
