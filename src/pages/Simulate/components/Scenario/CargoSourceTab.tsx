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
  TimePicker,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useScenarioConfig, {
  CargoSourceRow,
  SCENARIO_CONFIG_KEY,
} from "@/api/useScenarioConfig";
import { SCENARIO_FORECAST_KEY } from "@/api/useScenarioForecast";

interface SourceFormValues {
  name: string;
  isEnable: boolean;
  peripheralGroupId: string;
  customCargoMetadataId: string;
  variantKey: string | null;
  variantPool: { value: string; weight: number }[];
  window: [dayjs.Dayjs, dayjs.Dayjs];
  intervalMin: number;
  batchSize: number;
  jitterSec: number;
  maxTotal: number | null;
  whenFull: "WAIT" | "SKIP" | "STOP";
}

const CargoSourceTab: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useScenarioConfig();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [editing, setEditing] = useState<CargoSourceRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm<SourceFormValues>();

  const formatId = Form.useWatch("customCargoMetadataId", form);

  const sources = data?.sources ?? [];
  const options = data?.options ?? { groups: [], cargoFormats: [], robots: [] };

  const groupOptions = useMemo(
    () =>
      options.groups.map((g) => ({
        label: `${g.name} (${g.size})`,
        value: g.id,
      })),
    [options.groups]
  );

  const formatOptions = useMemo(
    () => options.cargoFormats.map((f) => ({ label: f.name, value: f.id })),
    [options.cargoFormats]
  );

  // 種類欄位只能從選到的格式裡挑, 而且不該是那個格式的唯一鍵
  // (唯一鍵每個貨物都不一樣, 拿來當種類沒有意義)
  const variantKeyOptions = useMemo(() => {
    const fmt = options.cargoFormats.find((f) => f.id === formatId);
    if (!fmt) return [];
    return fmt.keys
      .filter((k) => k !== fmt.uniqueKey)
      .map((k) => ({ label: k, value: k }));
  }, [options.cargoFormats, formatId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: SCENARIO_CONFIG_KEY });
    queryClient.invalidateQueries({ queryKey: SCENARIO_FORECAST_KEY });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) =>
      payload.id
        ? client.put(`/api/scenario/cargo-source/${payload.id}`, payload)
        : client.post("/api/scenario/cargo-source", payload),
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
    mutationFn: (id: string) =>
      client.delete(`/api/scenario/cargo-source/${id}`),
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
    form.setFieldsValue({
      isEnable: true,
      window: [dayjs("08:00", "HH:mm"), dayjs("18:00", "HH:mm")],
      intervalMin: 3,
      batchSize: 1,
      jitterSec: 0,
      whenFull: "WAIT",
      variantPool: [],
    });
    setIsOpen(true);
  };

  const openEdit = (row: CargoSourceRow) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      isEnable: row.isEnable,
      peripheralGroupId: row.peripheralGroupId,
      customCargoMetadataId: row.customCargoMetadataId,
      variantKey: row.variantKey,
      variantPool: row.variantPool ?? [],
      window: [
        dayjs(row.startTime, "HH:mm"),
        dayjs(row.endTime, "HH:mm"),
      ],
      intervalMin: Math.max(1, Math.round(row.intervalSec / 60)),
      batchSize: row.batchSize,
      jitterSec: row.jitterSec,
      maxTotal: row.maxTotal,
      whenFull: row.whenFull,
    });
    setIsOpen(true);
  };

  const save = () => {
    form.validateFields().then((values) => {
      const [start, end] = values.window;
      if (!end.isAfter(start)) {
        messageApi.warning(t("sim.scenario.end_after_start"));
        return;
      }

      saveMutation.mutate({
        id: editing?.id,
        name: values.name,
        isEnable: values.isEnable,
        peripheralGroupId: values.peripheralGroupId,
        customCargoMetadataId: values.customCargoMetadataId,
        variantKey: values.variantKey ?? null,
        variantPool: values.variantPool ?? [],
        startTime: start.format("HH:mm"),
        endTime: end.format("HH:mm"),
        intervalSec: values.intervalMin * 60,
        batchSize: values.batchSize,
        jitterSec: values.jitterSec ?? 0,
        maxTotal: values.maxTotal ?? null,
        whenFull: values.whenFull,
      });
    });
  };

  const columns = [
    {
      title: t("sim.scenario.source_name"),
      dataIndex: "name",
    },
    {
      title: t("sim.scenario.source_group"),
      render: (_: unknown, row: CargoSourceRow) => (
        <Tag color="blue">{row.peripheralGroupName}</Tag>
      ),
    },
    {
      title: t("sim.scenario.rate"),
      render: (_: unknown, row: CargoSourceRow) =>
        t("sim.scenario.rate_value", {
          batch: row.batchSize,
          minutes: Math.round(row.intervalSec / 60),
        }),
    },
    {
      title: t("sim.scenario.window"),
      render: (_: unknown, row: CargoSourceRow) =>
        `${row.startTime} – ${row.endTime}`,
    },
    {
      title: t("sim.scenario.variant"),
      render: (_: unknown, row: CargoSourceRow) =>
        row.variantKey ? (
          <Space size={4} wrap>
            {row.variantPool.map((v) => (
              <Tag key={v.value}>{`${v.value} ${v.weight}`}</Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: "#aaa" }}>—</span>
        ),
    },
    {
      title: t("sim.scenario.enabled"),
      width: 70,
      render: (_: unknown, row: CargoSourceRow) =>
        row.isEnable ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>,
    },
    {
      title: "",
      width: 90,
      render: (_: unknown, row: CargoSourceRow) => (
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
          message={t("sim.scenario.source_intro")}
          description={t("sim.scenario.source_intro_detail")}
        />

        <Flex justify="flex-end">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("sim.scenario.add_source")}
          </Button>
        </Flex>

        <Table
          size="small"
          rowKey="id"
          loading={isLoading}
          dataSource={sources}
          columns={columns as never}
          pagination={false}
          locale={{
            emptyText: <Empty description={t("sim.scenario.no_sources")} />,
          }}
        />
      </Flex>

      <Modal
        open={isOpen}
        onCancel={close}
        onOk={save}
        confirmLoading={saveMutation.isLoading}
        width={640}
        title={
          editing ? t("sim.scenario.edit_source") : t("sim.scenario.add_source")
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("sim.scenario.source_name")}
            name="name"
            rules={[{ required: true }]}
          >
            <Input placeholder={t("sim.scenario.source_name_placeholder")} />
          </Form.Item>

          <Flex gap={8}>
            <Form.Item
              label={t("sim.scenario.source_group")}
              name="peripheralGroupId"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={groupOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              label={t("sim.scenario.cargo_format")}
              name="customCargoMetadataId"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select options={formatOptions} />
            </Form.Item>
          </Flex>

          <Form.Item
            label={t("sim.scenario.variant_key")}
            name="variantKey"
            extra={t("sim.scenario.variant_key_hint")}
          >
            <Select
              allowClear
              options={variantKeyOptions}
              disabled={!formatId}
              placeholder="container_type"
            />
          </Form.Item>

          <Form.List name="variantPool">
            {(fields, { add, remove }) => (
              <Flex vertical gap={4}>
                {fields.map((field) => (
                  <Flex key={field.key} gap={8} align="baseline">
                    <Form.Item
                      {...field}
                      name={[field.name, "value"]}
                      rules={[{ required: true }]}
                      style={{ flex: 2, marginBottom: 8 }}
                    >
                      <Input placeholder={t("sim.scenario.variant_value")} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "weight"]}
                      rules={[{ required: true }]}
                      style={{ flex: 1, marginBottom: 8 }}
                    >
                      <InputNumber
                        min={1}
                        style={{ width: "100%" }}
                        placeholder={t("sim.scenario.variant_weight")}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Flex>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ value: "", weight: 1 })}
                  icon={<PlusOutlined />}
                  disabled={!form.getFieldValue("variantKey")}
                >
                  {t("sim.scenario.add_variant")}
                </Button>
              </Flex>
            )}
          </Form.List>

          <Form.Item
            label={t("sim.scenario.window")}
            name="window"
            rules={[{ required: true }]}
            style={{ marginTop: 16 }}
          >
            <TimePicker.RangePicker needConfirm={false} format="HH:mm" />
          </Form.Item>

          <Flex gap={8}>
            <Form.Item
              label={t("sim.scenario.interval_min")}
              name="intervalMin"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label={t("sim.scenario.batch_size")}
              name="batchSize"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label={t("sim.scenario.jitter_sec")}
              name="jitterSec"
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Flex>

          <Flex gap={8}>
            <Form.Item
              label={t("sim.scenario.max_total")}
              name="maxTotal"
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                style={{ width: "100%" }}
                placeholder={t("sim.scenario.unlimited")}
              />
            </Form.Item>
            <Form.Item
              label={t("sim.scenario.when_full")}
              name="whenFull"
              style={{ flex: 1 }}
            >
              <Select
                options={[
                  { label: t("sim.scenario.when_full_wait"), value: "WAIT" },
                  { label: t("sim.scenario.when_full_skip"), value: "SKIP" },
                  { label: t("sim.scenario.when_full_stop"), value: "STOP" },
                ]}
              />
            </Form.Item>
          </Flex>

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

export default CargoSourceTab;
