import {
  Button,
  Flex,
  Form,
  FormInstance,
  Input,
  InputNumber,
  Switch,
  Typography,
} from "antd";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { useSetAtom } from "jotai";
import {
  BaseGlobalCargoInfoModal,
  GlobalCargoInfo,
  GlobalCargoInfoModal,
} from "./jotaiState";
import { Cargo } from "@/types/peripheral";
import { LayerType } from "@/api/type/useLocation";

const prefixLevelName = (word: string | null | undefined) => {
  if (!word) return null;
  const parts = word.split("-");
  parts.pop();
  return parts.join("-");
};

const { Title } = Typography;

const LayerForm: FC<{
  locId: string;
  form: FormInstance<unknown>;
  layer: LayerType;
  setIsEditLayer: Dispatch<SetStateAction<boolean>>;
}> = ({ form, layer, setIsEditLayer, locId }) => {
  const { t } = useTranslation();
  const setCargoInfo = useSetAtom(GlobalCargoInfo);
  const [isClickBtn, setIsClickBtn] = useState(false);
  const setIsEditModalOpen = useSetAtom(BaseGlobalCargoInfoModal);

  const setOpenCargoInfo = useSetAtom(GlobalCargoInfoModal);

  const userHasChangeData = () => {
    setIsEditLayer(true);
  };

  const setOpenEditCargoDetailModal = (data: {
    dbId: string | null;
    level: number;
    cargo: Cargo[];
  }) => {
    // console.log(data.cargo, 'setting');
    setCargoInfo({
      locationId: locId,
      dbId: data.dbId,
      level: data.level,
      cargo: data.cargo,
    });
    setOpenCargoInfo(true);
    setIsClickBtn(true);
  };

  useEffect(() => {
    if (!layer) return;
    Object.entries(layer).forEach(([indexStr, info]) => {
      const levelName = prefixLevelName(info?.levelName);
      form.setFieldsValue({
        [`levelName${indexStr}`]: levelName,
        [`description${indexStr}`]: info.description,
        [`disable${indexStr}`]: info.disable || false,
        [`cargo_limit${indexStr}`]: info.cargo_limit || false,
        [`loadPriority${indexStr}`]: info.loadPriority || 0,
        [`offloadPriority${indexStr}`]: info.offloadPriority || 0,
      });
    });
  }, [form, layer]);

  const handleEditCargo = (dbId: string, level: number, cargo: any) => {
    setOpenEditCargoDetailModal({
      dbId,
      level,
      cargo,
    });
    setIsEditModalOpen(false);
  };

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
          onValuesChange={userHasChangeData}
          initialValues={{ isEdit: false }}
        >
          <Title level={3} style={{ marginBottom: "24px", color: "#1890ff" }}>
            {t("shelf.layer_form.layers")}
          </Title>
          {Object.entries(layer).map(([levelStr, levelValue]) => {
            const index = Number(levelStr);
            //  console.log(levelValue.cargo, 'level value');
            return (
              <div
                key={levelStr}
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
                >{`${t("shelf.layer_form.level")} ${index + 1}`}</Title>
                <Form.Item
                  label={t("shelf.layer_form.column_name")}
                  name={`levelName${index}`}
                  rules={[
                    {
                      required: true,
                      message: t("shelf.layer_form.level_name_required"),
                    },
                    {
                      pattern: /^[a-zA-Z0-9_]+$/,
                      message: t("shelf.layer_form.invalid_level_name"),
                    },
                  ]}
                >
                  <Input placeholder={t("shelf.layer_form.enter_level_name")} />
                </Form.Item>

                <Form.Item
                  label={t("shelf.layer_form.description")}
                  name={`description${index}`}
                >
                  <Input placeholder={t("shelf.layer_form.description")} />
                </Form.Item>

                <Button
                  disabled={isClickBtn}
                  onClick={() =>
                    handleEditCargo(
                      levelValue.dbId,
                      Number(levelStr),
                      levelValue.cargo
                    )
                  }
                >
                  {t("shelf.layer_form.edit_detail")}
                </Button>

                <Form.Item
                  label={t("shelf.layer_form.disable")}
                  name={`disable${index}`}
                  valuePropName="checked"
                >
                  <Switch checkedChildren="On" unCheckedChildren="Off" />
                </Form.Item>

                <Form.Item
                  label={t("edit_road_panel.limit")}
                  name={`cargo_limit${index}`}
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label={t("shelf.load_priority")}
                  name={`loadPriority${index}`}
                >
                  <InputNumber min={0} />
                </Form.Item>

                <Form.Item
                  label={t("shelf.offload_priority")}
                  name={`offloadPriority${index}`}
                >
                  <InputNumber min={0} />
                </Form.Item>
              </div>
            );
          })}
        </Form>
      </div>
    </>
  );
};

export default LayerForm;
