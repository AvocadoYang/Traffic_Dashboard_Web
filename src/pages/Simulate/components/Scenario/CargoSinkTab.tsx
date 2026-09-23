import { FC, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useScenarioConfig, {
  CargoSinkRow,
  SCENARIO_CONFIG_KEY,
} from "@/api/useScenarioConfig";
import { SCENARIO_FORECAST_KEY } from "@/api/useScenarioForecast";

interface SinkFormValues {
  name: string;
  isEnable: boolean;
  peripheralGroupId: string;
  dwellSec: number;
}

const CargoSinkTab: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useScenarioConfig();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [editing, setEditing] = useState<CargoSinkRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm<SinkFormValues>();

  const sinks = data?.sinks ?? [];
  const options = data?.options ?? { groups: [], cargoFormats: [], robots: [] };

  const groupOptions = useMemo(
    () =>
      options.groups.map((g) => ({
        label: `${g.name} (${g.size})`,
        value: g.id,
      })),
    [options.groups]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: SCENARIO_CONFIG_KEY });
    queryClient.invalidateQueries({ queryKey: SCENARIO_FORECAST_KEY });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) =>
      payload.id
        ? client.put(`/api/scenario/cargo-sink/${payload.id}`, payload)
        : client.post("/api/scenario/cargo-sink", payload),
    onSuccess: () => {
      messageApi.success(t("sim.scenario.saved"));
      invalidate();
      close();
    },
    onError: (err: any) =>
      messageApi.error(
        err?.response?.data?.error ?? t("sim.scenario.save_failed")
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`/api/scenario/cargo-sink/${id}`),
    onSuccess: () => {
      messageApi.success(t("sim.scenario.deleted"));
      invalidate();
    },
    onError: () => messageApi.error(t("sim.scenario.delete_failed")),
  });

  const close = () => {
    setIsOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isEnable: true, dwellSec: 60 });
    setIsOpen(true);
  };

  const openEdit = (row: CargoSinkRow) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      isEnable: row.isEnable,
      peripheralGroupId: row.peripheralGroupId,
      dwellSec: row.dwellSec,
    });
    setIsOpen(true);
  };

  const save = () => {
    form.validateFields().then((values) =>
      saveMutation.mutate({ id: editing?.id, ...values })
    );
  };

  const columns = [
    { title: t("sim.scenario.sink_name"), dataIndex: "name" },
    {
      title: t("sim.scenario.sink_group"),
      render: (_: unknown, row: CargoSinkRow) => (
        <Tag color="gold">{row.peripheralGroupName}</Tag>
      ),
    },
    {
      title: t("sim.scenario.dwell"),
      render: (_: unknown, row: CargoSinkRow) =>
        t("sim.scenario.dwell_value", { seconds: row.dwellSec }),
    },
    {
      title: t("sim.scenario.enabled"),
      width: 70,
      render: (_: unknown, row: CargoSinkRow) =>
        row.isEnable ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>,
    },
    {
      title: "",
      width: 90,
      render: (_: unknown, row: CargoSinkRow) => (
        <Space size={0}>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
          />
          <Popconfirm
            title={t("sim.scenario.confirm_delete")}
            onConfirm={() => deleteMutation.mutate(row.id)}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <Flex vertical gap={12}>
        <Alert
          type="info"
          showIcon
          message={t("sim.scenario.sink_intro")}
          description={t("sim.scenario.sink_intro_detail")}
        />

        <Flex justify="flex-end">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("sim.scenario.add_sink")}
          </Button>
        </Flex>

        <Table
          size="small"
          rowKey="id"
          loading={isLoading}
          dataSource={sinks}
          columns={columns as never}
          pagination={false}
          locale={{
            emptyText: <Empty description={t("sim.scenario.no_sinks")} />,
          }}
        />
      </Flex>

      <Modal
        open={isOpen}
        onCancel={close}
        onOk={save}
        confirmLoading={saveMutation.isLoading}
        title={
          editing ? t("sim.scenario.edit_sink") : t("sim.scenario.add_sink")
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("sim.scenario.sink_name")}
            name="name"
            rules={[{ required: true }]}
          >
            <Input placeholder={t("sim.scenario.sink_name_placeholder")} />
          </Form.Item>

          <Form.Item
            label={t("sim.scenario.sink_group")}
            name="peripheralGroupId"
            rules={[{ required: true }]}
          >
            <Select options={groupOptions} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item
            label={t("sim.scenario.dwell")}
            name="dwellSec"
            rules={[{ required: true }]}
            extra={t("sim.scenario.dwell_hint")}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label={t("sim.scenario.enabled")}
            name="isEnable"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CargoSinkTab;
