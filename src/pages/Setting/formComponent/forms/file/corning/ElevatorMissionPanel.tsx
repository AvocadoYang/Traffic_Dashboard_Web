import client from "@/api/axiosClient";
import useElevatorActive from "@/api/useElevatorActive";
import FormHr from "@/pages/Setting/utils/FormHr";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Form, message, Switch } from "antd";
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

const ElevatorMissionPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<{ active: boolean }>();
  const { t } = useTranslation();
  const { data } = useElevatorActive();
  const queryClient = useQueryClient();

  // Sync form when remote data loads
  useEffect(() => {
    if (data !== undefined) {
      form.setFieldsValue({ active: !!data.is_active });
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      client.post("api/corning/edit-elevator-mission", { isActive }),
    onSuccess: () => {
      messageApi.success("success");
      queryClient.invalidateQueries({ queryKey: ["elevator-active"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const onSaveValue = () => {
    // Read value directly from form — never from a separate state
    const isActive = form.getFieldValue("active") as boolean;
    saveMutation.mutate(isActive);
  };

  return (
    <>
      {contextHolder}
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          電梯任務設定
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <Form form={form} autoComplete="off" size="large" layout="vertical">
            <Form.Item
              label={<FieldLabel>電梯任務是否啟動</FieldLabel>}
              name="active"
              valuePropName="checked" // ← tells Form to use `checked` not `value`
            >
              <Switch />
            </Form.Item>
          </Form>

          <IndustrialButton
            onClick={onSaveValue}
            className="primary"
            loading={saveMutation.isPending}
          >
            確認修改
          </IndustrialButton>
        </Flex>
      </div>
    </>
  );
};

export default ElevatorMissionPanel;
