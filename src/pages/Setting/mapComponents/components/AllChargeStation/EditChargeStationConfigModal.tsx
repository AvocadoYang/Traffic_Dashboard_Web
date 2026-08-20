import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import { ECSM } from "@/pages/Setting/utils/settingJotai";
import { useAllAmrStatus } from "@/sockets/useAMRInfo";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Typography,
} from "antd";
import { AimOutlined } from "@ant-design/icons";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { currentMapIdAtom } from "@/utils/mapSelection";

const { Title, Text } = Typography;

type FormData = {
  locationId?: string;
  name: string;
  description: string;
  ip: string;
  port: number;
  stationId: string;
};

type DetectFormData = {
  amrId: string;
  markerPattern: number;
  locationId: string;
  curMapId: string;
};

type DetectResponse = {
  ok?: boolean;
  message?: string;
};

const CARD_STYLE: React.CSSProperties = {
  background: "#fff",
  padding: "24px",
  borderRadius: 8,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
};

const EditChargeStationConfigModal = () => {
  const [open, setOpen] = useAtom(ECSM);
  const [form] = Form.useForm<FormData>();
  const [formDetect] = Form.useForm<DetectFormData>();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const socketConfig = useChargeStationSocket();
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResponse | null>(null);
  const { data: name } = useName();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const AmrOption: { value: string; label: string }[] | undefined =
    useMemo(() => {
      let options;
      if (name?.isSim) {
        options = name.amrs
          .filter((a) => a.isReal === false)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      } else {
        options = name?.amrs
          .filter((a) => a.isReal === true)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      }
      return options ? [...options] : undefined;
    }, [name]);

  const editMutation = useMutation({
    mutationFn: (payload: FormData) =>
      client.post("/api/setting/update-charge-station-config", payload),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      setOpen({ locationId: null, isOpen: false });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const detectMutation = useMutation({
    mutationFn: (payload: DetectFormData) =>
      client.post<DetectResponse>("/api/amr/detect-marker", payload),
    onSuccess: (res) => {
      // 偵測是編輯充電站設定過程中的輔助動作，成功不應該直接關掉整個
      // Modal——把結果顯示在偵測區塊裡，讓使用者可以接著調整設定。
      setDetectResult(res.data ?? { ok: true });
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => {
      setDetectResult(null);
      errorHandler(e, messageApi);
    },
  });

  const handleCancel = () => {
    setOpen({ locationId: null, isOpen: false });
  };

  const handleOk = async () => {
    if (!open.locationId) return;

    try {
      const data = await form.validateFields();
      editMutation.mutate({
        ...data,
        locationId: open.locationId,
      });
    } catch (e) {
      // antd 表單驗證失敗會在欄位旁邊顯示錯誤，這裡不用額外處理
      console.error("Validation failed:", e);
    }
  };

  const handleDetect = async () => {
    try {
      const data = await formDetect.validateFields();
      setDetectResult(null);
      detectMutation.mutate({
        ...data,
        locationId: open.locationId || "",
        curMapId: currentMapId || "",
      });
    } catch (e) {
      console.error("Detect validation failed:", e);
    }
  };

  useEffect(() => {
    if (
      !socketConfig ||
      socketConfig === undefined ||
      !open ||
      !open.locationId ||
      !socketConfig[open.locationId] ||
      isFormInitialized // Skip if already initialized
    ) {
      return;
    }

    form.setFieldsValue({
      locationId: open.locationId,
      disable: socketConfig[open.locationId].disable,
      name: socketConfig[open.locationId].name,
      description: socketConfig[open.locationId].description,
      stationId: socketConfig[open.locationId].stationId,
    });
    setIsFormInitialized(true);
  }, [socketConfig, open, form, open.locationId]);

  useEffect(() => {
    if (!open.isOpen) {
      setIsFormInitialized(false);
      setDetectResult(null);
      form.resetFields();
      formDetect.resetFields();
    }
  }, [open.isOpen, form, formDetect]);

  return (
    <>
      {contextHolder}
      <Modal
        title={null}
        width={560}
        styles={{
          body: { padding: "24px", background: "#fafafa" },
        }}
        open={open.isOpen}
        onCancel={handleCancel}
        onOk={handleOk}
        confirmLoading={editMutation.isPending}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
      >
        <div style={CARD_STYLE}>
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

              <Form.Item
                label={t("charge.disable")}
                name="disable"
                valuePropName="checked"
              >
                <Switch checkedChildren="On" unCheckedChildren="Off" />
              </Form.Item>

              <Form.Item label={t("charge.model.station_id")} name="stationId">
                <Input min={1} max={9} />
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
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Skeleton active title={false} paragraph={{ rows: 1 }} />
              <Skeleton active title={false} paragraph={{ rows: 1 }} />
              <Skeleton active title={false} paragraph={{ rows: 1 }} />
              <Skeleton active title={false} paragraph={{ rows: 1 }} />
            </Space>
          )}
        </div>

        <Divider style={{ margin: "20px 0" }}>
          <Space size={6}>
            <AimOutlined style={{ color: "#1890ff" }} />
            <Text strong>{"點位偵測"}</Text>
          </Space>
        </Divider>

        <div style={CARD_STYLE}>
          <Form form={formDetect} layout="vertical" size="large">
            <Form.Item
              label="AMR"
              name="amrId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                placeholder={"please select an amr"}
                options={AmrOption}
              />
            </Form.Item>

            <Form.Item
              label="Marker Pattern"
              name="markerPattern"
              initialValue={20}
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item style={{ marginBottom: detectResult ? 16 : 0 }}>
              <Button
                type="primary"
                icon={<AimOutlined />}
                loading={detectMutation.isPending}
                onClick={handleDetect}
                block
              >
                {"開始偵測點位"}
              </Button>
            </Form.Item>

            {detectResult && (
              <Alert
                type={detectResult.ok === false ? "error" : "success"}
                showIcon
                message={detectResult.ok === false ? "偵測失敗" : "偵測完成"}
                description={
                  detectResult.message ?? JSON.stringify(detectResult)
                }
              />
            )}
          </Form>
        </div>
      </Modal>
    </>
  );
};

export default EditChargeStationConfigModal;