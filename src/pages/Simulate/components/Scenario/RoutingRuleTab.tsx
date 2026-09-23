import { FC, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useScenarioConfig, {
  RoutingRuleRow,
  ScenarioOptions,
  SCENARIO_CONFIG_KEY,
} from "@/api/useScenarioConfig";
import { SCENARIO_FORECAST_KEY } from "@/api/useScenarioForecast";
import { DEFAULT_PRIORITY, PRIORITY_OPTIONS } from "./constants";

interface RuleFormValues {
  name: string;
  isEnable: boolean;
  isFallback: boolean;
  matchKey: string | null;
  matchValue: string | null;
  destKind: "GROUP" | "PERIPHERAL";
  destGroupId: string | null;
  destPeripheralId: string | null;
  priority: number;
  amrRelateId: string | null;
}

const RoutingRuleTab: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useScenarioConfig();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [editing, setEditing] = useState<RoutingRuleRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm<RuleFormValues>();

  const isFallback = Form.useWatch("isFallback", form);
  const destKind = Form.useWatch("destKind", form);

  const rules = data?.rules ?? [];
  const options: ScenarioOptions = data?.options ?? {
    groups: [],
    cargoFormats: [],
    robots: [],
  };

  // 規則只能比對貨物格式裡真的有的欄位, 手打字串很容易拼錯
  const matchKeyOptions = useMemo(() => {
    const keys = new Set<string>();
    options.cargoFormats.forEach((f) => f.keys.forEach((k) => keys.add(k)));
    return [...keys].map((k) => ({ label: k, value: k }));
  }, [options.cargoFormats]);

  const groupOptions = useMemo(
    () =>
      options.groups.map((g) => ({
        label: `${g.name} (${g.size})`,
        value: g.id,
      })),
    [options.groups]
  );

  const peripheralOptions = useMemo(
    () =>
      options.groups
        .flatMap((g) => g.peripherals)
        .map((p) => ({ label: p.name, value: p.id })),
    [options.groups]
  );

  const requireAmr = data?.requireAmr ?? false;
  const robotOptions = useMemo(
    () => [
      ...(requireAmr
        ? []
        : [{ label: t("sim.scenario.auto_assign"), value: "" }]),
      ...options.robots.map((r) => ({ label: r.name, value: r.id })),
    ],
    [options.robots, requireAmr, t]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: SCENARIO_CONFIG_KEY });
    queryClient.invalidateQueries({ queryKey: SCENARIO_FORECAST_KEY });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) =>
      payload.id
        ? client.put(`/api/scenario/routing-rule/${payload.id}`, payload)
        : client.post("/api/scenario/routing-rule", payload),
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
      client.delete(`/api/scenario/routing-rule/${id}`),
    onSuccess: () => {
      messageApi.success(t("sim.scenario.deleted"));
      invalidate();
    },
    onError: () => messageApi.error(t("sim.scenario.delete_failed")),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) =>
      client.post("/api/scenario/routing-rule/reorder", { order }),
    onSuccess: invalidate,
    onError: () => messageApi.error(t("sim.scenario.save_failed")),
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
      isFallback: false,
      destKind: "GROUP",
      priority: DEFAULT_PRIORITY,
    });
    setIsOpen(true);
  };

  const openEdit = (row: RoutingRuleRow) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      isEnable: row.isEnable,
      isFallback: row.isFallback,
      matchKey: row.matchKey,
      matchValue: row.matchValue,
      destKind: row.destPeripheralId ? "PERIPHERAL" : "GROUP",
      destGroupId: row.destGroupId,
      destPeripheralId: row.destPeripheralId,
      priority: row.priority,
      amrRelateId: row.amrRelateId,
    });
    setIsOpen(true);
  };

  const save = () => {
    form.validateFields().then((values) => {
      saveMutation.mutate({
        id: editing?.id,
        name: values.name,
        isEnable: values.isEnable,
        isFallback: values.isFallback,
        ruleOrder: editing?.ruleOrder ?? rules.length,
        matchKey: values.isFallback ? null : values.matchKey,
        matchValue: values.isFallback ? null : values.matchValue,
        destGroupId: values.destKind === "GROUP" ? values.destGroupId : null,
        destPeripheralId:
          values.destKind === "PERIPHERAL" ? values.destPeripheralId : null,
        priority: values.priority,
        amrRelateId: values.amrRelateId || null,
      });
    });
  };

  // fallback 永遠在最後, 不參與排序
  const ordered = useMemo(
    () => rules.filter((r) => !r.isFallback),
    [rules]
  );
  const fallbackRule = rules.find((r) => r.isFallback) ?? null;

  const move = (index: number, delta: number) => {
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((r) => r.id));
  };

  const columns = [
    {
      title: "#",
      width: 90,
      render: (_: unknown, row: RoutingRuleRow, index: number) =>
        row.isFallback ? (
          <Tag color="default">{t("sim.scenario.fallback")}</Tag>
        ) : (
          <Space size={2}>
            <span style={{ minWidth: 18, display: "inline-block" }}>
              {index + 1}
            </span>
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            />
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              disabled={index === ordered.length - 1}
              onClick={() => move(index, 1)}
            />
          </Space>
        ),
    },
    {
      title: t("sim.scenario.rule_condition"),
      render: (_: unknown, row: RoutingRuleRow) =>
        row.isFallback ? (
          <span style={{ color: "#888" }}>
            {t("sim.scenario.fallback_hint")}
          </span>
        ) : (
          <span>
            <code>{row.matchKey}</code> = <b>{row.matchValue}</b>
          </span>
        ),
    },
    {
      title: t("sim.scenario.destination"),
      render: (_: unknown, row: RoutingRuleRow) =>
        row.destGroupName ? (
          <Tag color="blue">{row.destGroupName}</Tag>
        ) : (
          <Tag color="purple">{row.destPeripheralName}</Tag>
        ),
    },
    {
      title: t("sim.scenario.priority"),
      width: 90,
      render: (_: unknown, row: RoutingRuleRow) =>
        PRIORITY_OPTIONS.find((p) => p.value === row.priority)?.label ??
        row.priority,
    },
    {
      title: t("sim.scenario.amr"),
      width: 130,
      render: (_: unknown, row: RoutingRuleRow) =>
        row.amrId ?? (
          <span style={{ color: "#aaa" }}>{t("sim.scenario.auto_assign")}</span>
        ),
    },
    {
      title: t("sim.scenario.enabled"),
      width: 70,
      render: (_: unknown, row: RoutingRuleRow) =>
        row.isEnable ? (
          <Tag color="green">ON</Tag>
        ) : (
          <Tag color="default">OFF</Tag>
        ),
    },
    {
      title: "",
      width: 90,
      render: (_: unknown, row: RoutingRuleRow) => (
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

  const tableRows = fallbackRule ? [...ordered, fallbackRule] : ordered;

  return (
    <>
      {contextHolder}

      <Flex vertical gap={12}>
        <Alert
          type="info"
          showIcon
          message={t("sim.scenario.rule_intro")}
          description={t("sim.scenario.rule_intro_detail")}
        />

        {rules.length > 0 && !fallbackRule && (
          <Alert
            type="warning"
            showIcon
            message={t("sim.scenario.no_fallback_warning")}
          />
        )}

        <Flex justify="flex-end">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("sim.scenario.add_rule")}
          </Button>
        </Flex>

        <Table
          size="small"
          rowKey="id"
          loading={isLoading}
          dataSource={tableRows}
          columns={columns as never}
          pagination={false}
          locale={{
            emptyText: (
              <Empty description={t("sim.scenario.no_rules")} />
            ),
          }}
        />
      </Flex>

      <Modal
        open={isOpen}
        onCancel={close}
        onOk={save}
        confirmLoading={saveMutation.isLoading}
        title={
          editing ? t("sim.scenario.edit_rule") : t("sim.scenario.add_rule")
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("sim.scenario.rule_name")}
            name="name"
            rules={[{ required: true }]}
          >
            <Input placeholder="G5 → FS101" />
          </Form.Item>

          <Form.Item
            label={
              <Tooltip title={t("sim.scenario.fallback_hint")}>
                {t("sim.scenario.is_fallback")}
              </Tooltip>
            }
            name="isFallback"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {!isFallback && (
            <Flex gap={8}>
              <Form.Item
                label={t("sim.scenario.match_key")}
                name="matchKey"
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <Select
                  options={matchKeyOptions}
                  showSearch
                  placeholder="container_type"
                />
              </Form.Item>
              <Form.Item
                label={t("sim.scenario.match_value")}
                name="matchValue"
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="G5" />
              </Form.Item>
            </Flex>
          )}

          <Form.Item label={t("sim.scenario.dest_kind")} name="destKind">
            <Select
              options={[
                { label: t("sim.scenario.dest_group"), value: "GROUP" },
                { label: t("sim.scenario.dest_peripheral"), value: "PERIPHERAL" },
              ]}
            />
          </Form.Item>

          {destKind === "PERIPHERAL" ? (
            <Form.Item
              label={t("sim.scenario.dest_peripheral")}
              name="destPeripheralId"
              rules={[{ required: true }]}
            >
              <Select options={peripheralOptions} showSearch optionFilterProp="label" />
            </Form.Item>
          ) : (
            <Form.Item
              label={t("sim.scenario.dest_group")}
              name="destGroupId"
              rules={[{ required: true }]}
            >
              <Select options={groupOptions} showSearch optionFilterProp="label" />
            </Form.Item>
          )}

          <Flex gap={8}>
            <Form.Item
              label={t("sim.scenario.priority")}
              name="priority"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select options={PRIORITY_OPTIONS} />
            </Form.Item>
            <Form.Item
              label={t("sim.scenario.amr")}
              name="amrRelateId"
              rules={[{ required: requireAmr }]}
              style={{ flex: 1 }}
            >
              <Select
                allowClear={!requireAmr}
                options={robotOptions}
                placeholder={
                  requireAmr
                    ? t("sim.scenario.pick_amr")
                    : t("sim.scenario.auto_assign")
                }
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

export default RoutingRuleTab;
