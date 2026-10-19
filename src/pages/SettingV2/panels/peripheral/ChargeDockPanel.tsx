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

const POSE_KEYS = [
  "precise_x",
  "precise_y",
  "precise_yaw",
  "tolerance_x",
  "tolerance_y",
  "tolerance_yaw",
] as const;
type PoseKey = (typeof POSE_KEYS)[number];

/** 綁定在這座站的一台車自己的停準座標; 沒填的欄位是 null, 沿用充電站那一組 */
type BindingPose = { id: string; amrId: string } & {
  [K in PoseKey]: number | null;
};

type DockConfig = {
  id: string;
  station_id: string;
  precise_x: number;
  precise_y: number;
  precise_yaw: number;
  tolerance_x: number;
  tolerance_y: number;
  tolerance_yaw: number;
  amr_bindings?: BindingPose[];
};

const radToDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(2);
const mToMm = (m: number) => (m * 1000).toFixed(1);

/** 表格 / 說明文字裡的一個停準數值: 位置給 mm, 角度給度, 誤差前面加 ± */
const showPose = (key: PoseKey, v: number) => {
  const sign = key.startsWith("tolerance") ? "±" : "";
  return key.endsWith("yaw")
    ? `${sign}${radToDeg(v)}°`
    : `${sign}${mToMm(v)} mm`;
};

const inheritsAll = (binding: BindingPose) =>
  POSE_KEYS.every((key) => binding[key] === null);

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
  // 有值 = 對話框改的是 editing 這座站底下某一台車自己的停準座標
  const [editingBinding, setEditingBinding] = useState<BindingPose | null>(
    null,
  );
  const values = Form.useWatch([], form) as
    | Partial<Record<PoseKey, number | null>>
    | undefined;

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

  const saveBindingMutation = useMutation({
    mutationFn: (payload: Omit<BindingPose, "amrId">) =>
      client.post(
        "api/peripherals/update-charge-station-binding-docking",
        payload,
      ),
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
    setEditingBinding(null);
    form.resetFields();
  };

  const openEdit = (row: DockConfig) => {
    form.resetFields();
    form.setFieldsValue(row);
    setEditingBinding(null);
    setEditing(row);
  };

  const openEditBinding = (station: DockConfig, binding: BindingPose) => {
    form.resetFields();
    form.setFieldsValue(
      Object.fromEntries(POSE_KEYS.map((key) => [key, binding[key]])),
    );
    setEditingBinding(binding);
    setEditing(station);
  };

  const submit = async () => {
    if (!editing) return;
    let v: Record<PoseKey, number | null | undefined>;
    try {
      v = (await form.validateFields()) as typeof v;
    } catch {
      return;
    }

    if (editingBinding) {
      // 空白的欄位送 null: 這一項沿用充電站的
      saveBindingMutation.mutate({
        id: editingBinding.id,
        ...(Object.fromEntries(
          POSE_KEYS.map((key) => [key, v[key] ?? null]),
        ) as Record<PoseKey, number | null>),
      });
      return;
    }

    saveMutation.mutate({
      ...editing,
      ...(v as Omit<DockConfig, "id" | "station_id" | "amr_bindings">),
      id: editing.id,
    });
  };

  /** 這台車沒填的欄位, 實際用的是充電站的值 */
  const effective = (key: PoseKey) =>
    values?.[key] ?? (editingBinding && editing ? editing[key] : 0);

  const poseRules = [
    { required: !editingBinding, message: t("utils.required") },
  ];

  const poseExtra = (key: PoseKey) => {
    const own = values?.[key];
    if (own !== undefined && own !== null) return showPose(key, own);
    if (editingBinding && editing) {
      return t("setting_v2.charge_dock.inherit_value", {
        value: showPose(key, editing[key]),
      });
    }
    return showPose(key, 0);
  };

  const applyPreset = (key: keyof typeof PRESETS) => {
    form.setFieldsValue(PRESETS[key]);
  };

  /** 誤差設得太寬會造成充電片接觸不良,這裡沿用 v1 的門檻:Y 超過 30mm 或角度超過 5° */
  const isLoose =
    effective("tolerance_y") > 0.03 || effective("tolerance_yaw") > 0.087;

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

  /** 表格展開後: 綁定在這座站的每一台車, 沒填的欄位用淡色顯示充電站的值 */
  const bindingColumns = (
    station: DockConfig,
  ): TableColumnsType<BindingPose> => [
    {
      title: t("setting_v2.charge_dock.col_amr"),
      dataIndex: "amrId",
      key: "amrId",
      render: (v: string, binding) => (
        <>
          {v}{" "}
          {inheritsAll(binding) && (
            <Tag>{t("setting_v2.charge_dock.inherit_tag")}</Tag>
          )}
        </>
      ),
    },
    ...POSE_KEYS.map((key) => ({
      title: key.replace("precise", "TARGET").replace("tolerance", "TOL").replace("_", " ").toUpperCase(),
      key,
      render: (_: unknown, binding: BindingPose) => {
        const own = binding[key];
        return own === null ? (
          <span style={{ opacity: 0.5 }}>{showPose(key, station[key])}</span>
        ) : (
          showPose(key, own)
        );
      },
    })),
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_, binding) => (
        <Toolbar>
          <GhostButton onClick={() => openEditBinding(station, binding)}>
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

                {(row.amr_bindings ?? []).map((binding) => (
                  <CardFacts key={binding.id}>
                    <dt>{binding.amrId}</dt>
                    <dd>
                      {inheritsAll(binding) ? (
                        t("setting_v2.charge_dock.inherit_tag")
                      ) : (
                        <>
                          X {mToMm(binding.precise_x ?? row.precise_x)} mm · Y{" "}
                          {mToMm(binding.precise_y ?? row.precise_y)} mm ·{" "}
                          {radToDeg(binding.precise_yaw ?? row.precise_yaw)}°
                        </>
                      )}{" "}
                      <GhostButton
                        onClick={() => openEditBinding(row, binding)}
                      >
                        <EditOutlined />
                      </GhostButton>
                    </dd>
                  </CardFacts>
                ))}
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
              expandable={{
                rowExpandable: (row) => (row.amr_bindings?.length ?? 0) > 0,
                expandedRowRender: (row) => (
                  <Table<BindingPose>
                    size="small"
                    rowKey="id"
                    dataSource={row.amr_bindings ?? []}
                    columns={bindingColumns(row)}
                    pagination={false}
                  />
                ),
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editing}
        title={`${t("utils.edit")} — ${editing?.station_id ?? ""}${
          editingBinding ? ` / ${editingBinding.amrId}` : ""
        }`}
        onCancel={close}
        onOk={submit}
        confirmLoading={
          saveMutation.isLoading || saveBindingMutation.isLoading
        }
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Hint style={{ marginBottom: 12 }}>
            {t("setting_v2.charge_dock.axis_hint")}
          </Hint>

          {editingBinding && (
            <>
              <Hint style={{ marginBottom: 8 }}>
                {t("setting_v2.charge_dock.amr_hint")}
              </Hint>
              <Toolbar style={{ marginBottom: 12 }}>
                <GhostButton
                  onClick={() =>
                    form.setFieldsValue(
                      Object.fromEntries(POSE_KEYS.map((key) => [key, null])),
                    )
                  }
                >
                  {t("setting_v2.charge_dock.inherit_all")}
                </GhostButton>
              </Toolbar>
            </>
          )}

          <FieldLabel>{t("setting_v2.charge_dock.target_title")}</FieldLabel>
          <FieldGrid $cols={3} style={{ marginTop: 8 }}>
            <Field>
              {tipLabel("TARGET X", t("setting_v2.charge_dock.tip_target_x"))}
              <Form.Item
                name="precise_x"
                rules={poseRules}
                extra={poseExtra("precise_x")}
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
                rules={poseRules}
                extra={poseExtra("precise_y")}
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
                rules={poseRules}
                extra={poseExtra("precise_yaw")}
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
                rules={poseRules}
                extra={poseExtra("tolerance_x")}
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
                rules={poseRules}
                extra={poseExtra("tolerance_y")}
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
                rules={poseRules}
                extra={poseExtra("tolerance_yaw")}
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
                y: mToMm(effective("tolerance_y")),
                yaw: radToDeg(effective("tolerance_yaw")),
              })}
            </WarnNote>
          )}
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default ChargeDockPanel;
