import { useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { AimOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { LDM } from "../utils/settingJotai";

const { Title, Text } = Typography;

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

// 點位偵測。原本只存在於 EditChargeStationConfigModal 裡當作編輯充電站設定的
// 輔助動作,這裡抽成獨立 modal,直接點地圖上的點位就能觸發。
// 由 AllLocation 的 handleClick 透過 LDM atom 開啟(僅限有實體 marker 的類型,
// 見 MirAreaTypeMarker 的 isDetectableAreaType),渲染在 MapView。
const LocationDetectModal = () => {
  const [open, setOpen] = useAtom(LDM);
  const [formDetect] = Form.useForm<DetectFormData>();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
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

  const detectMutation = useMutation({
    mutationFn: (payload: DetectFormData) =>
      client.post<DetectResponse>("/api/amr/detect-marker", payload),
    onSuccess: (res) => {
      // 偵測結果留在 modal 裡顯示,不自動關閉,讓使用者可以看結果後再決定重試。
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
    if (!open.isOpen) {
      setDetectResult(null);
      formDetect.resetFields();
    }
  }, [open.isOpen, formDetect]);

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
        footer={null}
      >
        <div style={CARD_STYLE}>
          <Title
            level={3}
            style={{
              textAlign: "center",
              marginBottom: "8px",
              color: "#1890ff",
            }}
          >
            <Space size={6}>
              <AimOutlined />
              {"點位偵測"}
            </Space>
          </Title>

          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <Text type="secondary">{open.locationId}</Text>
          </div>

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
                title={detectResult.ok === false ? "偵測失敗" : "偵測完成"}
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

export default LocationDetectModal;
