import { FC, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Flex,
  Form,
  InputNumber,
  Select,
  Table,
  Tag,
  message,
} from "antd";
import { EyeOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useScenarioConfig from "@/api/useScenarioConfig";
import { DEFAULT_PRIORITY, PRIORITY_OPTIONS } from "./constants";

interface FormValues {
  count: number;
  loadGroupIds: string[];
  unloadGroupIds: string[];
  priority: number;
  amrId: string | null;
}

interface DispatchResult {
  requested: number;
  dispatched: number;
  dryRun: boolean;
  missions: { missionId: string; from: string; to: string }[];
  failed: { from: string; to: string; code: string; reason: string }[];
  loadAvailable: number;
  unloadAvailable: number;
}

/**
 * 壓測用: 一次派出 N 張「A 點取、B 點放」的隨機任務。
 * 不需要跑模擬也能按, 跟貨源/規則那套是分開的。
 */
const RandomMissionTab: FC = () => {
  const { t } = useTranslation();
  const { data } = useScenarioConfig();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<FormValues>();
  const [result, setResult] = useState<DispatchResult | null>(null);

  const options = data?.options ?? { groups: [], cargoFormats: [], robots: [] };
  const requireAmr = data?.requireAmr ?? false;
  const onlineRobots = options.robots.filter((r) => r.online);

  const groupOptions = useMemo(
    () =>
      options.groups.map((g) => ({
        label: `${g.name} (${g.size})`,
        value: g.id,
      })),
    [options.groups]
  );

  // 離線的車直接不給選 —— 派工檢查的是交管的 isLogin, 選了也只會收到
  // UNREGISTER_AMR。模擬車要按下「開始模擬」之後才會上線。
  const robotOptions = useMemo(
    () => [
      // 空字串在送出時會轉成 'none', 那是派工「自己挑一台」的約定值。
      // HAS_MIR 的環境不吃 'none', 所以那時不提供這個選項。
      ...(requireAmr
        ? []
        : [{ label: t("sim.scenario.auto_assign"), value: "" }]),
      ...options.robots.map((r) => ({
        label: r.online ? r.name : `${r.name}（${t("sim.scenario.offline")}）`,
        value: r.name,
        disabled: !r.online,
      })),
    ],
    [options.robots, requireAmr, t]
  );

  const dispatchMutation = useMutation({
    mutationFn: async (payload: FormValues & { dryRun: boolean }) => {
      const res = await client.post<DispatchResult>(
        "/api/scenario/random-missions",
        payload
      );
      return res.data;
    },
    onSuccess: (res) => {
      setResult(res);
      if (res.dryRun) {
        messageApi.info(
          t("sim.scenario.preview_ok", { count: res.missions.length })
        );
      } else if (res.dispatched === res.requested) {
        messageApi.success(
          t("sim.scenario.dispatch_ok", { count: res.dispatched })
        );
      } else {
        messageApi.warning(
          t("sim.scenario.dispatch_partial", {
            dispatched: res.dispatched,
            requested: res.requested,
          })
        );
      }
    },
    onError: (err: any) =>
      messageApi.error(
        err?.response?.data?.message ??
          err?.response?.data?.error ??
          t("sim.scenario.dispatch_failed")
      ),
  });

  const fire = (dryRun: boolean) => {
    form.validateFields().then((values) =>
      dispatchMutation.mutate({
        count: values.count,
        loadGroupIds: values.loadGroupIds ?? [],
        unloadGroupIds: values.unloadGroupIds ?? [],
        priority: values.priority,
        amrId: values.amrId || null,
        dryRun,
      })
    );
  };

  const plannedCount = result
    ? result.dryRun
      ? result.missions.length
      : result.dispatched
    : 0;

  const shortfall =
    result && plannedCount < result.requested
      ? result.loadAvailable < result.requested
        ? t("sim.scenario.shortfall_load", { count: result.loadAvailable })
        : t("sim.scenario.shortfall_unload", { count: result.unloadAvailable })
      : null;

  return (
    <>
      {contextHolder}

      <Flex vertical gap={12}>
        <Alert
          type="info"
          showIcon
          message={t("sim.scenario.random_intro")}
          description={t("sim.scenario.random_intro_detail")}
        />

        {onlineRobots.length === 0 && requireAmr && (
          <Alert
            type="warning"
            showIcon
            message={t("sim.scenario.no_online_amr")}
            description={t("sim.scenario.no_online_amr_detail")}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            count: 5,
            amrId: "",
            priority: DEFAULT_PRIORITY,
            loadGroupIds: [],
            unloadGroupIds: [],
          }}
        >
          <Form.Item
            label={t("sim.scenario.load_groups")}
            name="loadGroupIds"
            extra={t("sim.scenario.groups_hint")}
          >
            <Select
              mode="multiple"
              allowClear
              options={groupOptions}
              optionFilterProp="label"
              placeholder={t("sim.scenario.all_points")}
            />
          </Form.Item>

          <Form.Item
            label={t("sim.scenario.unload_groups")}
            name="unloadGroupIds"
            extra={t("sim.scenario.groups_hint")}
          >
            <Select
              mode="multiple"
              allowClear
              options={groupOptions}
              optionFilterProp="label"
              placeholder={t("sim.scenario.all_points")}
            />
          </Form.Item>

          <Flex gap={8}>
            <Form.Item
              label={t("sim.scenario.mission_count")}
              name="count"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} max={50} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label={t("sim.scenario.priority")}
              name="priority"
              style={{ flex: 1 }}
            >
              <Select options={PRIORITY_OPTIONS} />
            </Form.Item>
            <Form.Item
              label={t("sim.scenario.amr")}
              name="amrId"
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

          <Flex gap={8}>
            <Button
              icon={<EyeOutlined />}
              loading={dispatchMutation.isLoading}
              onClick={() => fire(true)}
              style={{ flex: 1 }}
            >
              {t("sim.scenario.preview")}
            </Button>
            <Button
              type="primary"
              danger
              icon={<ThunderboltOutlined />}
              loading={dispatchMutation.isLoading}
              onClick={() => fire(false)}
              style={{ flex: 2 }}
            >
              {t("sim.scenario.dispatch_now")}
            </Button>
          </Flex>
        </Form>

        {result && (
          <>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item
                label={
                  result.dryRun
                    ? t("sim.scenario.planned")
                    : t("sim.scenario.dispatched")
                }
              >
                <b>{plannedCount}</b> / {result.requested}
              </Descriptions.Item>
              <Descriptions.Item label={t("sim.scenario.pool")}>
                {t("sim.scenario.pool_value", {
                  load: result.loadAvailable,
                  unload: result.unloadAvailable,
                })}
              </Descriptions.Item>
            </Descriptions>

            {shortfall && <Alert type="warning" showIcon message={shortfall} />}

            {result.failed.length > 0 && (
              <Alert
                type="error"
                showIcon
                message={t("sim.scenario.rejected", {
                  count: result.failed.length,
                })}
                description={result.failed
                  .map((f) => `${f.from} → ${f.to}：${f.reason} (${f.code})`)
                  .join("; ")}
              />
            )}

            {result.dryRun && (
              <Alert
                type="info"
                showIcon
                message={t("sim.scenario.preview_note")}
              />
            )}

            <Table
              size="small"
              rowKey={(r: DispatchResult["missions"][number]) =>
                `${r.missionId}-${r.from}-${r.to}`
              }
              dataSource={result.missions}
              pagination={false}
              scroll={{ y: 260 }}
              columns={([
                ...(result.dryRun
                  ? []
                  : [
                      {
                        title: t("sim.scenario.mission_id"),
                        dataIndex: "missionId",
                        width: 140,
                      },
                    ]),
                {
                  title: t("sim.scenario.route"),
                  render: (_: unknown, row: { from: string; to: string }) => (
                    <span>
                      <Tag color="blue">{row.from}</Tag>→
                      <Tag color="green" style={{ marginLeft: 4 }}>
                        {row.to}
                      </Tag>
                    </span>
                  ),
                },
              ] as never)}
            />
          </>
        )}
      </Flex>
    </>
  );
};

export default RandomMissionTab;
