import { FC, useState } from "react";
import {
  Form,
  InputNumber,
  Modal,
  Skeleton,
  Table,
  Tooltip,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  AimOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useIsNarrow from "../../ui/useIsNarrow";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  GhostButton,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  Hint,
  WarnNote,
} from "../../ui/primitives";

type DockConfig = {
  id: string;
  station_id: string;
  precise_x: number;
  precise_y: number;
  precise_yaw: number;
  tolerance_x: number;
  tolerance_y: number;
  tolerance_yaw: number;
};

const radToDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(2);
const mToMm = (m: number) => (m * 1000).toFixed(1);

/** 現場常見的充電樁接觸型式,對應的容忍誤差範本 */
const PRESETS = {
  strict: { tolerance_x: 0.005, tolerance_y: 0.005, tolerance_yaw: 0.0175 },
  standard: { tolerance_x: 0.01, tolerance_y: 0.01, tolerance_yaw: 0.035 },
  loose: { tolerance_x: 0.03, tolerance_y: 0.03, tolerance_yaw: 0.087 },
} as const;

const ChargeDockPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const [editing, setEditing] = useState<DockConfig | null>(null);
  const values = Form.useWatch([], form) as Partial<DockConfig> | undefined;

  const {
    data: stations = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<DockConfig[]>({
    queryKey: ["chargeStationDockConfig"],
    queryFn: () =>
      client
        .get("api/peripherals/charge-station-dock-config")
        .then((res) => res.data as DockConfig[]),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: DockConfig) =>
      client.post("api/peripherals//update-charge-station-docking", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({
        queryKey: ["chargeStationDockConfig"],
      });
      close();
    },
    onError: () => void messageApi.error(t("utils.fail")),
  });

  const close = () => {
    setEditing(null);
    form.resetFields();
  };

  const openEdit = (row: DockConfig) => {
    form.setFieldsValue(row);
    setEditing(row);
  };

  const submit = async () => {
    if (!editing) return;
    let v: Omit<DockConfig, "id" | "station_id">;
    try {
      v = (await form.validateFields()) as typeof v;
    } catch {
      return;
    }
    saveMutation.mutate({ ...editing, ...v, id: editing.id });
  };

  const applyPreset = (key: keyof typeof PRESETS) => {
    form.setFieldsValue(PRESETS[key]);
  };

  /** 誤差設得太寬會造成充電片接觸不良,這裡沿用 v1 的門檻:Y 超過 30mm 或角度超過 5° */
  const isLoose =
    (values?.tolerance_y ?? 0) > 0.03 || (values?.tolerance_yaw ?? 0) > 0.087;

  const columns: TableColumnsType<DockConfig> = [
    {
      title: "STATION",
      dataIndex: "station_id",
      key: "station_id",
      width: 120,
      fixed: "left",
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "TARGET X",
      dataIndex: "precise_x",
      key: "precise_x",
      width: 140,
      render: (v: number) => `${v?.toFixed(3)} m (${mToMm(v)} mm)`,
    },
    {
      title: "TARGET Y",
      dataIndex: "precise_y",
      key: "precise_y",
      width: 140,
      render: (v: number) => `${v?.toFixed(3)} m (${mToMm(v)} mm)`,
    },
    {
      title: "TARGET YAW",
      dataIndex: "precise_yaw",
      key: "precise_yaw",
      width: 150,
      render: (v: number) => `${v?.toFixed(3)} rad (${radToDeg(v)}°)`,
    },
    {
      title: "TOL X",
      dataIndex: "tolerance_x",
      key: "tolerance_x",
      width: 110,
      render: (v: number) => `±${mToMm(v)} mm`,
    },
    {
      title: "TOL Y",
      dataIndex: "tolerance_y",
      key: "tolerance_y",
      width: 110,
      render: (v: number) => `±${mToMm(v)} mm`,
    },
    {
      title: "TOL YAW",
      dataIndex: "tolerance_yaw",
      key: "tolerance_yaw",
      width: 110,
      render: (v: number) => `±${radToDeg(v)}°`,
    },
    {
      title: "",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => openEdit(row)}>
            <EditOutlined />
          </GhostButton>
        </Toolbar>
      ),
    },
  ];

  const tipLabel = (label: string, tip: string) => (
    <FieldLabel>
      {label}{" "}
      <Tooltip title={tip}>
        <QuestionCircleOutlined />
      </Tooltip>
    </FieldLabel>
  );

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <AimOutlined />
          {t("toolbar.others.charge_dock_config")}
        </SectionTitle>

        <Hint>
          {t("setting_v2.charge_dock.hint")}
        </Hint>

        <Toolbar>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {stations.length === 0 ? (
          <EmptyState>{t("setting_v2.empty.charge_stations")}</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {stations.map((row) => (
              <ItemCard key={row.id} $selected={row.id === editing?.id}>
                <CardTitleRow>
                  <span>{row.station_id}</span>
                </CardTitleRow>

                <CardFacts>
                  <dt>TARGET</dt>
                  <dd>
                    X {mToMm(row.precise_x)} mm · Y {mToMm(row.precise_y)} mm ·{" "}
                    {radToDeg(row.precise_yaw)}°
                  </dd>
                  <dt>TOLERANCE</dt>
                  <dd>
                    ±{mToMm(row.tolerance_x)} mm · ±{mToMm(row.tolerance_y)} mm
                    · ±{radToDeg(row.tolerance_yaw)}°
                  </dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => openEdit(row)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<DockConfig>
              size="small"
              rowKey="id"
              dataSource={stations}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{ pageSize: 12, showTotal: (n) => t("utils.total", { total: n }) }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editing}
        title={`${t("utils.edit")} — ${editing?.station_id ?? ""}`}
        onCancel={close}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Hint style={{ marginBottom: 12 }}>
            {t("setting_v2.charge_dock.axis_hint")}
          </Hint>

          <FieldLabel>{t("setting_v2.charge_dock.target_title")}</FieldLabel>
          <FieldGrid $cols={3} style={{ marginTop: 8 }}>
            <Field>
              {tipLabel("TARGET X", t("setting_v2.charge_dock.tip_target_x"))}
              <Form.Item
                name="precise_x"
                rules={[{ required: true, message: t("utils.required") }]}
                extra={`${mToMm(values?.precise_x ?? 0)} mm`}
              >
                <InputNumber
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              {tipLabel("TARGET Y", t("setting_v2.charge_dock.tip_target_y"))}
              <Form.Item
                name="precise_y"
                rules={[{ required: true, message: t("utils.required") }]}
                extra={`${mToMm(values?.precise_y ?? 0)} mm`}
              >
                <InputNumber
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              {tipLabel("TARGET YAW", t("setting_v2.charge_dock.tip_target_yaw"))}
              <Form.Item
                name="precise_yaw"
                rules={[{ required: true, message: t("utils.required") }]}
                extra={`${radToDeg(values?.precise_yaw ?? 0)}°`}
              >
                <InputNumber
                  step={0.001}
                  precision={3}
                  addonAfter="rad"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>
          </FieldGrid>

          <FieldLabel>{t("setting_v2.charge_dock.tolerance_title")}</FieldLabel>
          <Toolbar style={{ margin: "8px 0 12px" }}>
            <GhostButton onClick={() => applyPreset("strict")}>
              {t("setting_v2.charge_dock.preset_strict")}
            </GhostButton>
            <GhostButton onClick={() => applyPreset("standard")}>
              {t("setting_v2.charge_dock.preset_standard")}
            </GhostButton>
            <GhostButton onClick={() => applyPreset("loose")}>
              {t("setting_v2.charge_dock.preset_loose")}
            </GhostButton>
          </Toolbar>

          <FieldGrid $cols={3}>
            <Field>
              {tipLabel("TOL X", t("setting_v2.charge_dock.tip_tol_x"))}
              <Form.Item
                name="tolerance_x"
                rules={[{ required: true, message: t("utils.required") }]}
                extra={`±${mToMm(values?.tolerance_x ?? 0)} mm`}
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              {tipLabel("TOL Y", t("setting_v2.charge_dock.tip_tol_y"))}
              <Form.Item
                name="tolerance_y"
                rules={[{ required: true, message: t("utils.required") }]}
                extra={`±${mToMm(values?.tolerance_y ?? 0)} mm`}
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  precision={3}
                  addonAfter="m"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            <Field>
              {tipLabel("TOL YAW", t("setting_v2.charge_dock.tip_tol_yaw"))}
              <Form.Item
                name="tolerance_yaw"
                rules={[{ required: true, message: t("utils.required") }]}
                extra={`±${radToDeg(values?.tolerance_yaw ?? 0)}°`}
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  precision={3}
                  addonAfter="rad"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>
          </FieldGrid>

          {isLoose && (
            <WarnNote>
              {t("setting_v2.charge_dock.loose_warn", {
                y: mToMm(values?.tolerance_y ?? 0),
                yaw: radToDeg(values?.tolerance_yaw ?? 0),
              })}
            </WarnNote>
          )}
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default ChargeDockPanel;
