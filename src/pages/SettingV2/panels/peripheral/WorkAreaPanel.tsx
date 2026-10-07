import { FC, useState } from "react";
import { Form, Input, InputNumber, Modal, Popconfirm, Select, Skeleton, message } from "antd";
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  WORK_AREA_CONFIG_KEY,
  WorkArea,
  WorkAreaConfig,
  WorkAreaRuntime,
  useWorkAreaConfig,
  useWorkAreaRuntime,
} from "@/api/useWorkAreas";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import StatusTag from "../../ui/StatusTag";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  Hint,
  EmptyState,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  WarnNote,
} from "../../ui/primitives";

/**
 * 作業區: 共用同一條走道的群組放在一起, 設定區內同時最多幾台車。
 * 等待點是點位的屬性, 在「編輯點位」和「點位列表」設定, 這裡只列出來。
 * 每張卡片下半部是即時狀態: 區內有誰、等待點上是誰、哪些任務在等進場。
 */
const WorkAreaPanel: FC = () => {
  const { t } = useTranslation();
  const { data: config, isLoading, isFetching, refetch } = useWorkAreaConfig();

  if (isLoading || !config) return <Skeleton active />;

  return (
    <PanelShell>
      {!config.schemaReady && <WarnNote>{t("work_areas.schema_not_ready")}</WarnNote>}
      {config.schemaReady && !config.waitingEnabled && (
        <WarnNote>{t("work_areas.waiting_off")}</WarnNote>
      )}
      <AreaSection config={config} reloading={isFetching} onReload={() => void refetch()} />
    </PanelShell>
  );
};

type AreaForm = { name: string; capacity: number; groupIds: string[] };

const toForm = (area: WorkArea | null): AreaForm =>
  area
    ? { name: area.name, capacity: area.capacity, groupIds: area.groupIds }
    : { name: "", capacity: 1, groupIds: [] };

/** 卡片標題旁的「區內幾台 / 上限」 */
const InsideTag: FC<{ runtime?: WorkAreaRuntime }> = ({ runtime }) => {
  const { t } = useTranslation();
  if (!runtime) return null;

  return (
    <StatusTag $on={runtime.inside.length > 0}>
      {t("work_areas.inside_n", { n: runtime.inside.length, max: runtime.capacity })}
    </StatusTag>
  );
};

/** 區內有誰、等待點上是誰、哪些任務在等進場 */
const AreaRuntime: FC<{ runtime?: WorkAreaRuntime }> = ({ runtime }) => {
  const { t } = useTranslation();
  if (!runtime) return null;

  return (
    <>
      <dt>{t("work_areas.inside")}</dt>
      <dd>
        {t("work_areas.inside_n", { n: runtime.inside.length, max: runtime.capacity })}
        {runtime.inside.map((e) => (
          <div key={e.missionId ?? e.amrId}>
            {e.missionId
              ? t("work_areas.inside_mission", {
                  amr: e.amrId ?? t("work_areas.no_car_yet"),
                  mission: e.missionId,
                })
              : t("work_areas.inside_idle", { amr: e.amrId })}
          </div>
        ))}
      </dd>
      {runtime.waitPoints.length > 0 && (
        <>
          <dt>{t("work_areas.line")}</dt>
          <dd>
            {runtime.waitPoints.map((p) => (
              <div key={p.locationId}>
                {t(`work_areas.point_state.${p.state}`, {
                  point: p.locationId,
                  amr: p.amrId ?? t("work_areas.no_car_yet"),
                })}
              </div>
            ))}
          </dd>
        </>
      )}
      <dt>{t("work_areas.waiting_missions")}</dt>
      <dd>
        {runtime.waiting.length === 0
          ? "—"
          : runtime.waiting.map((w) => (
              <div key={w.missionId}>{`${w.missionId}：${w.reason || "—"}`}</div>
            ))}
      </dd>
    </>
  );
};

const AreaSection: FC<{
  config: WorkAreaConfig;
  reloading: boolean;
  onReload: () => void;
}> = ({ config, reloading, onReload }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: runtime } = useWorkAreaRuntime();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<AreaForm>();
  const [editing, setEditing] = useState<WorkArea | null>(null);
  const [open, setOpen] = useState(false);

  const areaName = (id: string | null) => config.areas.find((a) => a.id === id)?.name ?? "";
  const liveOf = (areaId: string) => runtime?.find((r) => r.areaId === areaId);
  const groupName = (id: string) => config.groups.find((g) => g.id === id)?.name ?? id;

  // 一個群組只能屬於一個作業區: 已經在別區的不能選, 要先從那一區拿掉
  const groupOptions = config.groups.map((g) => {
    const inOtherArea = !!g.workAreaId && g.workAreaId !== editing?.id;
    return {
      value: g.id,
      disabled: inOtherArea,
      label: inOtherArea
        ? t("work_areas.group_in_other_area", { name: g.name, area: areaName(g.workAreaId) })
        : g.name,
    };
  });

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void queryClient.invalidateQueries({ queryKey: WORK_AREA_CONFIG_KEY });
    // 刪掉作業區會連帶取消它的等待點, 點位列表要跟著更新
    void queryClient.invalidateQueries({ queryKey: ["all-groups-resources"] });
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (payload: AreaForm & { id?: string }) =>
      payload.id
        ? client.put(`/api/work-area/areas/${payload.id}`, payload)
        : client.post("/api/work-area/areas", payload),
    onSuccess: () => {
      onDone();
      setOpen(false);
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.delete(`/api/work-area/areas/${id}`),
    onSuccess: onDone,
    onError,
  });

  const openEdit = (area: WorkArea | null) => {
    setEditing(area);
    form.setFieldsValue(toForm(area));
    setOpen(true);
  };

  const submit = async () => {
    let values: AreaForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    saveMutation.mutate({ ...values, id: editing?.id });
  };

  return (
    <Section>
      {contextHolder}
      <SectionTitle>
        <ApartmentOutlined />
        {t("work_areas.title")}
      </SectionTitle>
      <Hint>{t("work_areas.hint")}</Hint>
      <Hint>{t("work_areas.who_queues")}</Hint>

      <Toolbar>
        <SolidButton onClick={() => openEdit(null)} disabled={!config.schemaReady}>
          <PlusOutlined />
          {t("work_areas.add_area")}
        </SolidButton>
        <GhostButton onClick={onReload} disabled={reloading}>
          <ReloadOutlined />
          {t("utils.reload")}
        </GhostButton>
      </Toolbar>

      {config.areas.length === 0 ? (
        <EmptyState>{t("work_areas.no_area")}</EmptyState>
      ) : (
        <CardList>
          {config.areas.map((a) => (
            <ItemCard key={a.id}>
              <CardTitleRow>
                <span>{a.name}</span>
                <InsideTag runtime={liveOf(a.id)} />
              </CardTitleRow>
              <CardFacts>
                <dt>{t("work_areas.capacity")}</dt>
                <dd>{t("work_areas.capacity_n", { n: a.capacity })}</dd>
                <dt>{t("work_areas.groups")}</dt>
                <dd>{a.groupIds.length ? a.groupIds.map(groupName).join("、") : "—"}</dd>
                <dt>{t("work_areas.wait_points")}</dt>
                <dd>
                  {a.waitPoints.length
                    ? a.waitPoints.map((p) => p.locationId).join(" → ")
                    : t("work_areas.no_wait_point")}
                </dd>
                <AreaRuntime runtime={liveOf(a.id)} />
              </CardFacts>
              {a.tooClose.length > 0 && (
                <Hint>
                  {t("work_areas.too_close", {
                    gap: config.minGap,
                    // 不用 "/": i18next 會把插入值裡的斜線跳脫成 &#x2F;
                    pairs: a.tooClose.map(([p, q]) => `${p}-${q}`).join("、"),
                  })}
                </Hint>
              )}
              <Toolbar>
                <GhostButton onClick={() => openEdit(a)}>
                  <EditOutlined />
                  {t("utils.edit")}
                </GhostButton>
                <Popconfirm
                  title={t("work_areas.delete_warn")}
                  okText={t("utils.confirm")}
                  cancelText={t("utils.cancel")}
                  onConfirm={() => deleteMutation.mutate(a.id)}
                >
                  <DangerButton>
                    <DeleteOutlined />
                    {t("utils.delete")}
                  </DangerButton>
                </Popconfirm>
              </Toolbar>
            </ItemCard>
          ))}
        </CardList>
      )}
      <Hint>{t("work_areas.wait_point_hint")}</Hint>

      <Modal
        open={open}
        title={editing ? t("work_areas.edit_area") : t("work_areas.add_area")}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        forceRender
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("work_areas.name")}</FieldLabel>
              <Form.Item name="name" rules={[{ required: true, message: t("utils.required") }]}>
                <Input placeholder={t("work_areas.name_placeholder")} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("work_areas.capacity")}</FieldLabel>
              <Form.Item
                name="capacity"
                extra={t("work_areas.capacity_hint")}
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <InputNumber min={1} max={50} precision={0} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <FieldLabel>{t("work_areas.groups")}</FieldLabel>
          <Form.Item name="groupIds" extra={t("work_areas.groups_hint")}>
            <Select mode="multiple" options={groupOptions} optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>
    </Section>
  );
};

export default WorkAreaPanel;
