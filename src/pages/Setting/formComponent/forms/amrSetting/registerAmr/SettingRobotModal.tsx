import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { useMutation } from "@tanstack/react-query";
import { Button, Flex, Form, Input, InputNumber, message, Modal } from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";

type Form_Data = {
  name: string;
  value: string;
  width: number;
  length: number;
  height: number;
};

const SettingRobotModal: FC<{ open: boolean; cancel: () => void }> = ({
  open,
  cancel,
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();

  const createMutation = useMutation({
    mutationFn: (payload: Form_Data) => {
      return client.post("api/setting/create-robot-type", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleAdd = () => {
    const values = form.getFieldsValue() as Form_Data;
    createMutation.mutate(values);
  };

  return (
    <>
      {contextHolder}
      <Modal open={open} onCancel={cancel} footer={[]}>
        <Form form={form}>
          <Form.Item name="name" label={"name"} rules={[{ required: true }]}>
            <Input placeholder="002" max={999} min={1} />
          </Form.Item>

          <Form.Item name="value" label={"value"} rules={[{ required: true }]}>
            <Input placeholder="002" max={999} min={1} />
          </Form.Item>

          <Form.Item name="width" label={"width"} rules={[{ required: true }]}>
            <InputNumber placeholder="002" max={999} min={1} addonAfter={"M"} />
          </Form.Item>

          <Form.Item
            name="length"
            label={"length"}
            rules={[{ required: true }]}
          >
            <InputNumber placeholder="002" max={999} min={1} addonAfter={"M"} />
          </Form.Item>

          <Form.Item
            name="height"
            label={"height"}
            rules={[{ required: true }]}
          >
            <InputNumber placeholder="002" max={999} min={1} addonAfter={"M"} />
          </Form.Item>
        </Form>
        <Button onClick={handleAdd}>{t("utils.add")}</Button>
      </Modal>
    </>
  );
};

export default SettingRobotModal;
