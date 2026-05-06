import client from "@/api/axiosClient";
import { ECSM } from "@/pages/Setting/utils/settingJotai";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Skeleton,
  Typography,
} from "antd";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

type FormData = {
  locationId?: string;
  name: string;
  description: string;
  ip: string;
  port: number;
  stationId: string;
};

const EditChargeStationConfigModal = () => {
  const [open, setOpen] = useAtom(ECSM);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const socketConfig = useChargeStationSocket();

  const editMutation = useMutation({
    mutationFn: (payload: FormData) =>
      client.post("/api/setting/update-charge-station-config", payload),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      setOpen({ locationId: null, isOpen: false });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleCancel = () => {
    setOpen({ locationId: null, isOpen: false });
  };

  const handleOk = async () => {
    if (!open.locationId) return;

    const data = form.getFieldsValue() as FormData;

    editMutation.mutate({
      ...data,
      locationId: open.locationId,
    });

    try {
    } catch (e) {
      console.error("Validation failed:", e);
    }
  };

  useEffect(() => {
    if (
      !socketConfig ||
      socketConfig === undefined ||
      !open ||
      !open.locationId ||
      !socketConfig[open.locationId]
    )
      return;

    form.setFieldsValue({
      locationId: open.locationId,
      name: socketConfig[open.locationId].name,
      description: socketConfig[open.locationId].description,
      port: socketConfig[open.locationId].port,
      ip: socketConfig[open.locationId].ip,
      stationId: socketConfig[open.locationId].stationId,
    });
  }, [socketConfig]);

  return (
    <>
      {contextHolder}
      <Modal
        styles={{
          body: { padding: "24px", background: "#fafafa" },
        }}
        open={open.isOpen}
        onCancel={handleCancel}
        onOk={handleOk}
      >
        <div
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          {open && open.locationId && socketConfig[open.locationId] ? (
            <Form form={form} layout="vertical" size="large">
              <Title
                level={3}
                style={{
                  textAlign: "center",
                  marginBottom: "24px",
                  color: "#1890ff",
                }}
              >
                {t("charge.model.edit_charge_station_config")}
              </Title>
              <Form.Item label={t("charge.model.station_id")} name="stationId">
                <InputNumber min={1} max={9} />
              </Form.Item>
              <Form.Item
                label={t("charge.model.ip_address")}
                name="ip"
                rules={[
                  {
                    pattern:
                      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                    message: t("charge.model.ip_invalid"),
                  },
                  {
                    required: true,
                    message: t("charge.model.ip_required"),
                  },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item label={t("charge.model.port")} name="port">
                <InputNumber max={65536} min={0} />
              </Form.Item>
              <Form.Item
                label={t("charge.model.name")}
                name="name"
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
                <Input />
              </Form.Item>
              <Form.Item
                label={t("charge.model.description")}
                name="description"
              >
                <Input />
              </Form.Item>
            </Form>
          ) : (
            <>
              <Skeleton active />
              <Skeleton active />
              <Skeleton active />
              <Skeleton active />
              <Skeleton active />
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default EditChargeStationConfigModal;
