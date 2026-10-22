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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      client
        .get("api/peripherals/charge-station-dock-config")
        .then((res) => res.data),
  });

  // 2. 更新充電站對接設定
  const saveMutation = useMutation({
    mutationFn: (payload: ChargeStationConfig) => {
      return client.post(
        "api/peripherals//update-charge-station-docking",
        payload,
      );
    },
    onSuccess: () => {
      message.success(t("charge_dock.update_success"));
      setIsModalOpen(false);
      setEditingStation(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["chargeStationDockConfig"] });
    },
    onError: (error) => {
      console.error(error);
      message.error(t("charge_dock.update_failed"));
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
      message.info(t("charge_dock.preset_applied_strict"));
    } else if (type === "standard") {
      // 標準極板接觸式 (±10mm, ±2°)
      form.setFieldsValue({
        tolerance_x: 0.01,
        tolerance_y: 0.01,
        tolerance_yaw: 0.035, // ~2 deg
      });
      message.info(t("charge_dock.preset_applied_standard"));
    } else if (type === "loose") {
      // 無線感應/大面積式 (±30mm, ±5°)
      form.setFieldsValue({
        tolerance_x: 0.03,
        tolerance_y: 0.03,
        tolerance_yaw: 0.087, // ~5 deg
      });
      message.info(t("charge_dock.preset_applied_loose"));
    }
  };

  const columns = [
    {
      title: t("charge_dock.station_id"),
      dataIndex: "station_id",
      key: "station_id",
      render: (station_id: string) => (
        <Tag color="blue" icon={<ThunderboltOutlined />}>
          {station_id}
        </Tag>
      ),
    },
    {
      title: t("charge_dock.col_target"),
      children: [
        {
          title: t("charge_dock.col_x"),
          dataIndex: "precise_x",
          key: "precise_x",
          render: (val: number) => `${val?.toFixed(3)} m (${mToMm(val)} mm)`,
        },
        {
          title: t("charge_dock.col_y"),
          dataIndex: "precise_y",
          key: "precise_y",
          render: (val: number) => `${val?.toFixed(3)} m (${mToMm(val)} mm)`,
        },
        {
          title: t("charge_dock.col_yaw"),
          dataIndex: "precise_yaw",
          key: "precise_yaw",
          render: (val: number) => `${val?.toFixed(3)} rad (${radToDeg(val)}°)`,
        },
      ],
    },
    {
      title: t("charge_dock.col_tolerance"),
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
      title: t("utils.action"),
      key: "action",
      render: (_: any, record: ChargeStationConfig) => (
        <Button
          type="primary"
          ghost
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {t("charge_dock.calibrate")}
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
            {t("charge_dock.panel_title")}
          </Title>
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          {t("utils.reload")}
        </Button>
      }
      style={{ margin: "20px" }}
    >
      {/* 現場操作提示 */}
      <Alert
        message={t("charge_dock.notice_title")}
        description={t("charge_dock.notice_desc")}
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
        title={t("charge_dock.modal_title", { id: editingStation?.id })}
        open={isModalOpen}
        onOk={handleFormSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingStation(null);
        }}
        confirmLoading={saveMutation.isPending}
        okText={t("charge_dock.save")}
        cancelText={t("utils.cancel")}
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
              {t("charge_dock.axis_title")}
            </Text>
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={8}>
                <Text size="small">
                  • <b>{t("charge_dock.axis_x")}</b>{t("charge_dock.axis_x_desc")}
                </Text>
              </Col>
              <Col span={8}>
                <Text size="small">
                  • <b>{t("charge_dock.axis_y")}</b>{t("charge_dock.axis_y_desc")}
                </Text>
              </Col>
              <Col span={8}>
                <Text size="small">
                  • <b>{t("charge_dock.axis_yaw")}</b>{t("charge_dock.axis_yaw_desc")}
                </Text>
              </Col>
            </Row>
          </Card>

          {/* 第一區塊：精準對接目標值 */}
          <Divider orientation="left" style={{ margin: "12px 0" }}>
            {t("charge_dock.section_target")}
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="precise_x"
                label={
                  <Space>
                    <span>{t("charge_dock.target_x")}</span>
                    <Tooltip title={t("charge_dock.tip_target_x")}>
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: t("charge_dock.field_required", { field: "Target X" }) }]}
                extra={t("charge_dock.equals_mm", {
                  mm: mToMm(formValues?.precise_x || 0),
                })}
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
                    <span>{t("charge_dock.target_y")}</span>
                    <Tooltip title={t("charge_dock.tip_target_y")}>
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: t("charge_dock.field_required", { field: "Target Y" }) }]}
                extra={t("charge_dock.equals_mm", {
                  mm: mToMm(formValues?.precise_y || 0),
                })}
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
                    <span>{t("charge_dock.target_yaw")}</span>
                    <Tooltip title={t("charge_dock.tip_target_yaw")}>
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: t("charge_dock.field_required", { field: "Target Yaw" }) }]}
                extra={t("charge_dock.equals_deg", {
                  deg: radToDeg(formValues?.precise_yaw || 0),
                })}
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
            {t("charge_dock.section_tolerance")}
          </Divider>

          {/* 快捷設置按鈕 */}
          <Space style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t("charge_dock.preset_label")}
            </Text>
            <Button size="small" onClick={() => applyPreset("strict")}>
              {t("charge_dock.preset_strict")}
            </Button>
            <Button size="small" onClick={() => applyPreset("standard")}>
              {t("charge_dock.preset_standard")}
            </Button>
            <Button size="small" onClick={() => applyPreset("loose")}>
              {t("charge_dock.preset_loose")}
            </Button>
          </Space>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="tolerance_x"
                label={
                  <Space>
                    <span>Tolerance X (±m)</span>
                    <Tooltip title={t("charge_dock.tip_tol_x")}>
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: t("charge_dock.field_required", { field: "Tolerance X" }) }]}
                extra={t("charge_dock.range_mm", {
                  mm: mToMm(formValues?.tolerance_x || 0),
                })}
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
                    <Tooltip title={t("charge_dock.tip_tol_y")}>
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: t("charge_dock.field_required", { field: "Tolerance Y" }) }]}
                extra={t("charge_dock.range_mm", {
                  mm: mToMm(formValues?.tolerance_y || 0),
                })}
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
                    <Tooltip title={t("charge_dock.tip_tol_yaw")}>
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: t("charge_dock.field_required", { field: "Tolerance Yaw" }) }]}
                extra={t("charge_dock.range_deg", {
                  deg: radToDeg(formValues?.tolerance_yaw || 0),
                })}
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
              message={t("charge_dock.loose_title")}
              description={t("charge_dock.loose_desc", {
                y: mToMm(formValues?.tolerance_y),
                yaw: radToDeg(formValues?.tolerance_yaw),
              })}
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