// CargoFormatModal.tsx
import { Button, Form, Input, Modal, Select, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { FC, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    custom_name: string;
    is_default: boolean;
    format: string;
  }) => void;
  initialValues?: {
    custom_name: string;
    is_default: boolean;
    format: Record<string, string>;
    unique_key: string;
  };
  loading?: boolean;
}

const CargoFormatModal: FC<Props> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  loading,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  console.log(initialValues);
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        custom_name: initialValues.custom_name,
        is_default: initialValues.is_default,
        format: Object.entries(initialValues.format).map(([key, value]) => ({
          key,
          value,
        })),
      });
    } else {
      form.resetFields();
    }
  }, [initialValues, form, open]);

  const handleFinish = (values: {
    custom_name: string;
    is_default: boolean;
    format: Array<any>;
  }) => {
    const transformed = values.format.reduce(
      (acc: Record<string, string>, item) => {
        if (item.key) acc[item.key] = item.value;
        return acc;
      },
      {}
    );
    onSubmit({
      custom_name: values.custom_name,
      is_default: values.is_default,
      format: JSON.stringify(transformed),
    });
  };

  return (
    <Modal
      open={open}
      title={t("customCargo.modalTitle")}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="custom_name"
          label={t("customCargo.name")}
          rules={[{ required: true }]}
        >
          <Input placeholder={t("customCargo.namePlaceholder")} />
        </Form.Item>

        <Form.Item
          name="is_default"
          label={t("customCargo.isDefault")}
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: true, label: t("utils.yes") },
              { value: false, label: t("utils.no") },
            ]}
          />
        </Form.Item>

        <Form.List name="format">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => {
                const currentKey = form.getFieldValue(["format", name, "key"]);
                // Only lock if editing existing data AND this row is the unique_key
                const isUniqueKey =
                  !!initialValues && currentKey === initialValues?.unique_key;

                return (
                  <Space key={key} align="baseline" style={{ marginBottom: 8 }}>
                    {/* Key input */}
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
                      <Input
                        disabled={isUniqueKey} // lock unique_key only in edit mode
                        placeholder="e.g., container_id"
                      />
                    </Form.Item>

                    {/* Type select */}
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
                        disabled={isUniqueKey} // lock type if it’s the unique_key
                        options={[
                          { value: "string", label: "string" },
                          { value: "number", label: "number" },
                          { value: "boolean", label: "boolean" },
                        ]}
                        style={{ width: 120 }}
                      />
                    </Form.Item>

                    {/* Remove button only if not unique_key */}
                    {(!isUniqueKey || !initialValues) && (
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    )}
                  </Space>
                );
              })}
              <Form.Item>
                <Button
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                  type="dashed"
                >
                  {t("customCargo.addField")}
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t("utils.save")}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CargoFormatModal;
