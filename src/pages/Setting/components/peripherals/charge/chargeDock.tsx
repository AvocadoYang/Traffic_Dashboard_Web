import React, { useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  message,
  Space,
  Tag,
  Card,
  Typography,
  Alert,
  Tooltip,
  Row,
  Col,
  Divider,
} from "antd";
import {
  EditOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  AimOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";

const { Title, Text, Paragraph } = Typography;

// 角度/弧度與長度換算輔助函式
const radToDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(2);
const mToMm = (m: number) => (m * 1000).toFixed(1);

interface ChargeStationConfig {
  id: string;
  station_id: string;
  precise_x: number;
  precise_y: number;
  precise_yaw: number;
  tolerance_x: number;
  tolerance_y: number;
  tolerance_yaw: number;
}

const ChargeDockSetting: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<ChargeStationConfig | null>(null);

  // 監聽 Form 數值變化以進行即時單位換算顯示
  const formValues = Form.useWatch([], form);

  // 1. 取得充電站對接設定列表
  const {
    data: stations = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<ChargeStationConfig[]>({
    queryKey: ["chargeStationDockConfig"],
    queryFn: () =>
      client.get("/charge-station-dock-config").then((res) => res.data),
  });

  // 2. 更新充電站對接設定
  const saveMutation = useMutation({
    mutationFn: (payload: ChargeStationConfig) => {
      return client.post("/update-charge-station-docking", payload);
    },
    onSuccess: () => {
      message.success("充電站對接參數更新成功！");
      setIsModalOpen(false);
      setEditingStation(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["chargeStationDockConfig"] });
    },
    onError: (error) => {
      console.error(error);
      message.error("更新失敗，請檢查網路或後端伺服器狀態。");
    },
  });

  const handleEdit = (record: ChargeStationConfig) => {
    setEditingStation(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingStation) {
        saveMutation.mutate({
          id: editingStation.id,
          ...values,
        });
      }
    } catch (err) {
      // 表單驗證失敗
    }
  };

  // FAE 快捷帶入參數範本
  const applyPreset = (type: "strict" | "standard" | "loose") => {
    if (type === "strict") {
      // 高精度彈片式 (±5mm, ±1°)
      form.setFieldsValue({
        tolerance_x: 0.005,
        tolerance_y: 0.005,
        tolerance_yaw: 0.0175, // ~1 deg
      });
      message.info("已帶入：高精度彈片式接觸預設值 (±5mm / ±1°)");
    } else if (type === "standard") {
      // 標準極板接觸式 (±10mm, ±2°)
      form.setFieldsValue({
        tolerance_x: 0.01,
        tolerance_y: 0.01,
        tolerance_yaw: 0.035, // ~2 deg
      });
      message.info("已帶入：標準極板接觸式預設值 (±10mm / ±2°)");
    } else if (type === "loose") {
      // 無線感應/大面積式 (±30mm, ±5°)
      form.setFieldsValue({
        tolerance_x: 0.03,
        tolerance_y: 0.03,
        tolerance_yaw: 0.087, // ~5 deg
      });
      message.info("已帶入：無線感應/寬鬆模式預設值 (±30mm / ±5°)");
    }
  };

  const columns = [
    {
      title: "充電站 ID",
      dataIndex: "station_id",
      key: "station_id",
      render: (station_id: string) => (
        <Tag color="blue" icon={<ThunderboltOutlined />}>
          {station_id}
        </Tag>
      ),
    },
    {
      title: "目標座標 (Precise Target)",
      children: [
        {
          title: "X (前後)",
          dataIndex: "precise_x",
          key: "precise_x",
          render: (val: number) => `${val?.toFixed(3)} m (${mToMm(val)} mm)`,
        },
        {
          title: "Y (左右)",
          dataIndex: "precise_y",
          key: "precise_y",
          render: (val: number) => `${val?.toFixed(3)} m (${mToMm(val)} mm)`,
        },
        {
          title: "Yaw (角度)",
          dataIndex: "precise_yaw",
          key: "precise_yaw",
          render: (val: number) => `${val?.toFixed(3)} rad (${radToDeg(val)}°)`,
        },
      ],
    },
    {
      title: "容忍誤差 (Tolerance)",
      children: [
        {
          title: "Tol X",
          dataIndex: "tolerance_x",
          key: "tolerance_x",
          render: (val: number) => (
            <Text type="danger">±{val} m (±{mToMm(val)} mm)</Text>
          ),
        },
        {
          title: "Tol Y",
          dataIndex: "tolerance_y",
          key: "tolerance_y",
          render: (val: number) => (
            <Text type="danger">±{val} m (±{mToMm(val)} mm)</Text>
          ),
        },
        {
          title: "Tol Yaw",
          dataIndex: "tolerance_yaw",
          key: "tolerance_yaw",
          render: (val: number) => (
            <Text type="danger">±{val} rad (±{radToDeg(val)}°)</Text>
          ),
        },
      ],
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: ChargeStationConfig) => (
        <Button
          type="primary"
          ghost
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          FAE 校正設定
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <AimOutlined style={{ fontSize: "20px", color: "#1890ff" }} />
          <Title level={4} style={{ margin: 0 }}>
            AGV 充電站對接精準度校正面板 (FAE Calibration Panel)
          </Title>
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          重新整理
        </Button>
      }
      style={{ margin: "20px" }}
    >
      {/* 現場操作提示 */}
      <Alert
        message="FAE 現場對接注意事項"
        description="請將 AGV 以手動/自動模式對接至充電站，確認充電金屬片完全接觸良好後，讀取當前 AGV Pose (X, Y, Yaw) 並填入【目標精準座標】。同時根據充電樁彈片寬度設定【容忍誤差】。"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 20 }}
      />

      <Table
        dataSource={stations}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        bordered
        pagination={{ pageSize: 10 }}
      />

      {/* 編輯 Modal */}
      <Modal
        title={`🔧 站點校正參數設定 [ 充電站 ID: ${editingStation?.id} ]`}
        open={isModalOpen}
        onOk={handleFormSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingStation(null);
        }}
        confirmLoading={saveMutation.isPending}
        okText="儲存對接設定"
        cancelText="取消"
        width={720}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 10 }}>
          {/* 坐標系定義說明 */}
          <Card
            size="small"
            style={{
              backgroundColor: "#fafafa",
              marginBottom: 20,
              borderColor: "#d9d9d9",
            }}
          >
            <Text bold type="secondary">
              📐 坐標軸與角度說明 (AGV 車身坐標系)：
            </Text>
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={8}>
                <Text size="small">
                  • <b>X 軸 (前後)</b>：車頭前進方向。對接距離深度。
                </Text>
              </Col>
              <Col span={8}>
                <Text size="small">
                  • <b>Y 軸 (左右)</b>：車身橫向偏移。控制彈片對齊。
                </Text>
              </Col>
              <Col span={8}>
                <Text size="small">
                  • <b>Yaw (旋轉角)</b>：車頭偏轉角度。控制姿態平行度。
                </Text>
              </Col>
            </Row>
          </Card>

          {/* 第一區塊：精準對接目標值 */}
          <Divider orientation="left" style={{ margin: "12px 0" }}>
            1. 目標精準座標 (Precise Target)
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="precise_x"
                label={
                  <Space>
                    <span>Target X (公尺)</span>
                    <Tooltip title="AGV 停好在充電站時，標準的 X 軸位置 (米)">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: "請輸入 Target X" }]}
                extra={`相當於 ${mToMm(formValues?.precise_x || 0)} mm`}
              >
                <InputNumber
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="precise_y"
                label={
                  <Space>
                    <span>Target Y (公尺)</span>
                    <Tooltip title="AGV 停好在充電站時，標準的 Y 軸位置 (米)">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: "請輸入 Target Y" }]}
                extra={`相當於 ${mToMm(formValues?.precise_y || 0)} mm`}
              >
                <InputNumber
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="precise_yaw"
                label={
                  <Space>
                    <span>Target Yaw (弧度)</span>
                    <Tooltip title="AGV 停好在充電站時，標準的車頭角度 (Radian)">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: "請輸入 Target Yaw" }]}
                extra={`角度相當於 ${radToDeg(formValues?.precise_yaw || 0)}°`}
              >
                <InputNumber
                  step={0.001}
                  precision={3}
                  addonAfter="rad"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 第二區塊：容忍誤差 */}
          <Divider orientation="left" style={{ margin: "12px 0" }}>
            2. 容許誤差門檻 (Tolerance)
          </Divider>

          {/* 快捷設置按鈕 */}
          <Space style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              ⚡ 常用設備快捷帶入：
            </Text>
            <Button size="small" onClick={() => applyPreset("strict")}>
              高精度彈片 (±5mm / ±1°)
            </Button>
            <Button size="small" onClick={() => applyPreset("standard")}>
              標準極板 (±10mm / ±2°)
            </Button>
            <Button size="small" onClick={() => applyPreset("loose")}>
              無線感應 (±30mm / ±5°)
            </Button>
          </Space>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="tolerance_x"
                label={
                  <Space>
                    <span>Tolerance X (±m)</span>
                    <Tooltip title="允許前後距離偏差的最大值，超過此值判定未停好">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: "請輸入 Tolerance X" }]}
                extra={`許容範圍：±${mToMm(formValues?.tolerance_x || 0)} mm`}
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="tolerance_y"
                label={
                  <Space>
                    <span>Tolerance Y (±m)</span>
                    <Tooltip title="允許左右偏離的最大值。建議設定小於彈片寬度的一半。">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: "請輸入 Tolerance Y" }]}
                extra={`許容範圍：±${mToMm(formValues?.tolerance_y || 0)} mm`}
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="tolerance_yaw"
                label={
                  <Space>
                    <span>Tolerance Yaw (±rad)</span>
                    <Tooltip title="允許車頭偏轉角度的最大值。角度過大可能導致彈片單邊接觸不良。">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: "請輸入 Tolerance Yaw" }]}
                extra={`許容範圍：±${radToDeg(formValues?.tolerance_yaw || 0)}°`}
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  precision={3}
                  addonAfter="rad"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 安全提醒警告 */}
          {(formValues?.tolerance_y > 0.03 || formValues?.tolerance_yaw > 0.087) && (
            <Alert
              message="注意：設定的容忍誤差較寬鬆"
              description={`當前 Y 軸誤差容許 ±${mToMm(formValues?.tolerance_y)}mm / 角度容許 ±${radToDeg(formValues?.tolerance_yaw)}°。請確認充電樁觸點面積足夠大，以免造成接觸不良或磨損！`}
              type="warning"
              showIcon
              style={{ marginTop: 10 }}
            />
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default ChargeDockSetting;