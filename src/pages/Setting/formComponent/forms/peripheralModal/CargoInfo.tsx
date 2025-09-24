import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Switch,
  Typography,
} from "antd";
import { FormInstance } from "antd/es/form/Form";
import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAtomValue, useSetAtom } from "jotai";
import { IsEditPeripheralModal, IsOpenCargoEditorModal } from "./jotai";

const { Title } = Typography;

const prefixLevelName = (word: string | null | undefined) => {
  if (!word) return "";
  if (word === "null") return "";
  const parts = word.split("-");
  parts.pop();
  return parts.join("-");
};

const CargoInfoAtPeripheral: FC<{ form: FormInstance<unknown> }> = ({
  form,
}) => {
  const { t } = useTranslation();
  const setOpenModal = useSetAtom(IsOpenCargoEditorModal);
  const openModal = useAtomValue(IsEditPeripheralModal);

  const setOpenEditCargoDetailModal = () => {
    setOpenModal(true);
  };

  useEffect(() => {
    if (!openModal || !openModal.cargo) return;
    // console.log(openModal)
    // console.log(prefixLevelName(openModal.name), 'asdas')

    form.setFieldValue("hasCargo", openModal.cargo.length > 0);
    form.setFieldValue("name", prefixLevelName(openModal.name));
    form.setFieldValue("disable", openModal.disable);
    form.setFieldValue("loadPriority", openModal.loadPriority);
    form.setFieldValue("offloadPriority", openModal.offloadPriority);
  }, []);

  return (
    <>
      <div
        style={{
          width: "50%",
          background: "#fff",
          padding: "24px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        <Form
          form={form}
          layout="vertical"
          size="large"
          initialValues={{ isEdit: false }}
        >
          <Title level={3} style={{ marginBottom: "24px", color: "#1890ff" }}>
            {t("shelf.layer_form.layers")}
          </Title>
          <div
            style={{
              marginBottom: "24px",
              padding: "16px",
              background: "#f5f5f5",
              borderRadius: 6,
            }}
          >
            <Title
              level={4}
              style={{ marginBottom: "16px" }}
            >{`${t("shelf.layer_form.level")}`}</Title>
            <Form.Item label={t("shelf.layer_form.column_name")} name={`name`}>
              <Input placeholder={t("shelf.layer_form.enter_level_name")} />
            </Form.Item>
            <Form.Item
              label={t("shelf.layer_form.disable")}
              name={`disable`}
              valuePropName="checked"
            >
              <Switch checkedChildren="On" unCheckedChildren="Off" />
            </Form.Item>
            <Flex align="center" gap="middle">
              <Button onClick={() => setOpenEditCargoDetailModal()}>
                {t("shelf.layer_form.edit_detail")}
              </Button>
            </Flex>

            <Form.Item label={t("shelf.load_priority")} name={`loadPriority`}>
              <InputNumber min={0} />
            </Form.Item>

            <Form.Item
              label={t("shelf.offload_priority")}
              name={`offloadPriority`}
            >
              <InputNumber min={0} />
            </Form.Item>
          </div>
        </Form>
      </div>
    </>
  );
};

export default CargoInfoAtPeripheral;
