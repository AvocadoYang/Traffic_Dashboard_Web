import useElevatorInfo from "@/api/useElevatorInfo";
import {
  EEC,
  EEM,
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import {
  Button,
  Form,
  FormInstance,
  Input,
  InputNumber,
  Switch,
  Typography,
} from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { FC } from "react";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

const RightSide: FC<{
  form: FormInstance<unknown>;
  locationId: string;
}> = ({ form, locationId }) => {
  const { t } = useTranslation();
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);
  const { data: elevator } = useElevatorInfo(locationId);
  const setOpenModal = useSetAtom(EEC);
  const setOpenFirst = useSetAtom(EEM);
  const handleCon = () => {
    if (quickRoad) {
      setQuickRoadArr((prev) => [...prev, locationId]);
      return;
    }
    if (!elevator) return;

    setOpenFirst((prev) => {
      return { locationId: prev.locationId, isOpen: false };
    });
    setOpenModal(true);
  };

  return (
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
      <Form form={form} layout="vertical" size="large">
        <Title
          level={3}
          style={{
            textAlign: "center",
            marginBottom: "24px",
            color: "#1890ff",
          }}
        >
          {t("elevator.other_config")}
        </Title>
        <Form.Item label={t("elevator.name")} name={`name`}>
          <Input />
        </Form.Item>

        <Form.Item label={t("elevator.description")} name={`description`}>
          <Input />
        </Form.Item>

        <Button onClick={handleCon}>{t("elevator.edit_cargo_detail")}</Button>

        <Form.Item
          label={t("elevator.disable")}
          name={`disable`}
          valuePropName="checked"
        >
          <Switch checkedChildren="On" unCheckedChildren="Off" />
        </Form.Item>

        <Form.Item label={t("shelf.load_priority")} name={`loadPriority`}>
          <InputNumber min={0} />
        </Form.Item>

        <Form.Item label={t("shelf.offload_priority")} name={`offloadPriority`}>
          <InputNumber min={0} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default RightSide;
