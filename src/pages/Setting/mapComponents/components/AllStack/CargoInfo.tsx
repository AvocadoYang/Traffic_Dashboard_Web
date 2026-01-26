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
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  EditStackConfig,
  IsOpenStackModal,
} from "@/pages/Setting/formComponent/forms/peripheralModal/jotai";
import { ESC, ESM } from "@/pages/Setting/utils/settingJotai";

const { Title } = Typography;

const CargoInfoAtPeripheral: FC<{ form: FormInstance<unknown> }> = ({
  form,
}) => {
  const { t } = useTranslation();
  const setOpenContainerModal = useSetAtom(ESC);
  const setOpenContainer = useSetAtom(ESM);
  const openModal = useAtomValue(EditStackConfig);
  const setOpen = useSetAtom(IsOpenStackModal);

  const setOpenEditCargoDetailModal = () => {
    setOpenContainer({
      locationId: openModal?.stationId as string,
      isOpen: true,
    });
    setOpenContainerModal(true);
    setOpen(false);
  };

  useEffect(() => {
    if (!openModal || !openModal.cargo) return;

    form.setFieldValue("name", openModal.name);
    form.setFieldValue("description", openModal.description);
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
              label={t("shelf.layer_form.description")}
              name={`description`}
            >
              <Input placeholder="description" />
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
