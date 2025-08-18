import { Button, Form, Input, message, Modal, Select, Space } from "antd";
import { FC, useState } from "react";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorHandler } from "@/utils/utils";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";

type Payload = {
  custom_name: string;
  format: string;
};

const CreateFormat: FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: Payload) =>
      client.post("/api/setting/create-custom-cargo-format", payload),
    onSuccess: async () => {
      queryClient.refetchQueries({ queryKey: ["custom-cargo-format"] });
      form.resetFields();
      messageApi.success(t("utils.success"));
      setIsModalOpen(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const onFinish = (values: { custom_name: string; format: Array<any> }) => {
    const transformed = values.format.reduce(
      (acc: Record<string, string>, item) => {
        if (item.key) acc[item.key] = item.value;
        return acc;
      },
      {},
    );
    createMutation.mutate({
      custom_name: values.custom_name,
      format: JSON.stringify(transformed),
    });
  };

  return (
    <>
      {contextHolder}
      <Button type="primary" onClick={() => setIsModalOpen(true)}>
        {t("customCargo.create")}
      </Button>

      <Modal
        title={t("customCargo.modalTitle")}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label={t("customCargo.name")}
            name="custom_name"
            rules={[{ required: true }]}
          >
            <Input placeholder={t("customCargo.namePlaceholder")} />
          </Form.Item>

          <Form.List name="format">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: "flex", marginBottom: 8 }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "key"]}
                      rules={[
                        {
                          required: true,
                          message: t("customCargo.keyRequired"),
                        },
                      ]}
                    >
                      <Input placeholder="e.g., container_id" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "value"]}
                      rules={[
                        {
                          required: true,
                          message: t("customCargo.valueRequired"),
                        },
                      ]}
                    >
                      <Select
                        style={{ width: 120 }}
                        options={[
                          { value: "string", label: "string" },
                          { value: "number", label: "number" },
                          { value: "boolean", label: "boolean" },
                        ]}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    block
                  >
                    {t("customCargo.addField")}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={createMutation.isLoading}
            >
              {t("utils.save")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CreateFormat;
