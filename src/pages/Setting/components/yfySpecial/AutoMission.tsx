import React, { FC, useEffect } from "react";
import FormHr from "../../utils/FormHr";
import { Button, Flex, Form, message, Switch } from "antd";
import useYfyAutoMission from "@/sockets/useYfyAutoMission";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

// 定義任務設定的型別，方便重用
interface AutoMissionSettings {
  arm_to_temp: boolean;
  arm_to_pk1: boolean;
  temp_to_dock: boolean;
  otry_to_itry3: boolean;
  pk12_to_ot1: boolean;
}

const AutoMission: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  // 從 Socket 獲取當前伺服器狀態
  const currentValue = useYfyAutoMission();

  // 更新 Mutation 的傳入參數型別
  const saveMutation = useMutation({
    mutationFn: (data: AutoMissionSettings) =>
      client.post("api/setting/save-auto-mission", data),
    onSuccess: () => {
      messageApi.success("設定儲存成功");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 當 Socket 傳來新數值時，更新表單內容
  useEffect(() => {
    if (currentValue) {
      form.setFieldsValue(currentValue);
    }
  }, [currentValue, form]);

  const onFinish = (values: AutoMissionSettings) => {
    saveMutation.mutate(values);
  };

  // 如果還沒拿到初始值，可以顯示 Loading 或回傳 null
  if (!currentValue) return null;

  return (
    <>
      {contextHolder}
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          自動任務設定
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <Form
            form={form}
            layout="horizontal"
            onFinish={onFinish}
            initialValues={currentValue}
            labelCol={{ span: 16 }}
            wrapperCol={{ span: 8 }}
            style={{ width: "100%", maxWidth: "400px" }}
          >
            <Form.Item
              label="機械手臂到暫存區"
              name="arm_to_temp"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="機械手臂到打包區"
              name="arm_to_pk1"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="暫存區到碼頭區"
              name="temp_to_dock"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="包裝區貨區到包裝暫存區"
              name="pk12_to_ot1"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="機械手臂補棧版"
              name="otry_to_itry3"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={saveMutation.isPending}
                block
              >
                儲存設定
              </Button>
            </Form.Item>
          </Form>
        </Flex>
      </div>
    </>
  );
};

export default AutoMission;
