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
import { CargoPanelTarget } from "@/components/CargoPanel/state";
import {
  editHalfPanelStyle,
  editSubPanelStyle,
  EDIT_TITLE_COLOR,
} from "../editModalStyle";

const { Title } = Typography;

const CargoInfoAtPeripheral: FC<{ form: FormInstance<unknown> }> = ({
  form,
}) => {
  const { t } = useTranslation();
  const openCargoPanel = useSetAtom(CargoPanelTarget);
  const openModal = useAtomValue(EditStackConfig);
  const setOpen = useSetAtom(IsOpenStackModal);

  // 貨物改用跟主畫面同一個面板編輯
  const setOpenEditCargoDetailModal = () => {
    if (!openModal?.stationId) return;
    openCargoPanel({ type: "STACK", locationId: openModal.stationId });
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
      <div style={editHalfPanelStyle}>
        <Form
          form={form}
          layout="vertical"
          size="large"
          initialValues={{ isEdit: false }}
        >
          <Title
            level={3}
            style={{ marginBottom: "24px", color: EDIT_TITLE_COLOR }}
          >
            {t("shelf.layer_form.layers")}
          </Title>
          <div style={editSubPanelStyle}>
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
              <Switch
                checkedChildren={t("utils.on")}
                unCheckedChildren={t("utils.off")}
              />
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
