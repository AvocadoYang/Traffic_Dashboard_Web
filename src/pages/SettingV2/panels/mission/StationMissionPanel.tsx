import { FC, useMemo } from "react";
import { Form, Popconfirm, Select, Skeleton, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  CloseCircleOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import useAmrOptions from "../../ui/useAmrOptions";
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
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  Hint,
} from "../../ui/primitives";

export type StationMissionRow = {
  id?: string;
  active?: boolean;
  amrId?: (string | undefined)[];
  /** 這一筆只管哪些充電站; 空的 = 所有充電站 */
  stationLocationIds?: string[];
  missionId?: string | null;
  name?: string | null;
};

type Props = {
  /** 這一頁的標題 */
  title: string;
  /** 標題下面的一行說明: 這一頁的任務什麼時候會被跑 */
  hint: string;
  rows: StationMissionRow[];
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => unknown;
  missionOptions: { value: string; label: string }[];
  api: { add: string; active: string; remove: string };
};

type FormValues = {
  amrId: string[];
  missionId: string;
  stationLocationIds?: string[];
};

// 狀態 / 車輛 / 任務這幾個字, 進站和出站兩頁用同一組
const tp = "mission.before_left_charge_station_mission";
const ts = "mission.station_mission";

// 欄寬加起來約 645px: 設定頁的面板大概這麼寬, 「充電站」那一欄不用橫向捲動
// 就看得到

/**
 * 「進入充電站強制任務」和「離開充電站強制任務」共用的設定頁:
 * 哪些車、在哪些充電站、要跑哪個任務。新增後是關著的, 要另外開啟。
 */
const StationMissionPanel: FC<Props> = ({
  title,
  hint,
  rows,
  isLoading,
  isFetching,
  refetch,
  missionOptions,
  api,
}) => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<FormValues>();

  const amrOptions = useAmrOptions();
  const stations = useChargeStationSocket();

  const stationOptions = useMemo(
    () =>
      Object.values(stations ?? {})
        .filter(Boolean)
        .sort((a, b) => a.locationId.localeCompare(b.locationId))
        .map((s) => ({
          value: s.locationId,
          label: s.name ? `${s.locationId} ${s.name}` : s.locationId,
        })),
    [stations],
  );

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void refetch();
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const addMutation = useMutation({
    mutationFn: (payload: FormValues) => client.post(api.add, payload),
    onSuccess: () => {
      onDone();
      form.resetFields();
    },
    onError,
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      client.post(api.active, payload),
    onSuccess: onDone,
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post(api.remove, { id }),
    onSuccess: onDone,
    onError,
  });

  const submit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    addMutation.mutate({
      ...values,
      stationLocationIds: values.stationLocationIds ?? [],
    });
  };

  /** 表格顯示車輛時去掉機種前綴,只留編號,跟 v1 一致 */
  const shortAmr = (full: string) => full.split("-").slice(1).join("-") || full;

  const amrTags = (row: StationMissionRow) =>
    row.amrId?.length
      ? row.amrId.map((a, i) => <Tag key={`${a}-${i}`}>{shortAmr(a ?? "")}</Tag>)
      : "—";

  const stationTags = (row: StationMissionRow) =>
    row.stationLocationIds?.length ? (
      row.stationLocationIds.map((id) => <Tag key={id}>{id}</Tag>)
    ) : (
      <Tag>{t(`${ts}.all_stations`)}</Tag>
    );

  const toggle = (row: StationMissionRow) => {
    if (!row.id) return null;
    const id = row.id;
    return row.active ? (
      <GhostButton
        onClick={() => activeMutation.mutate({ id, isActive: false })}
      >
        <CloseCircleOutlined />
        {t(`${tp}.stale`)}
      </GhostButton>
    ) : (
      <GhostButton onClick={() => activeMutation.mutate({ id, isActive: true })}>
        <PlayCircleOutlined />
        {t(`${tp}.executing`)}
      </GhostButton>
    );
  };

  const filterByLabel = {
    filterOption: (input: string, option?: { value: string; label: string }) =>
      (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
  };

  const columns: TableColumnsType<StationMissionRow> = [
    {
      title: t(`${tp}.status`),
      key: "active",
      width: 80,
      fixed: "left",
      filters: [
        { text: t(`${tp}.executing`), value: true },
        { text: t(`${tp}.stale`), value: false },
      ],
      onFilter: (value, r) => !!r.active === value,
      render: (_, r) => (
        <StatusTag $on={!!r.active}>
          {r.active ? t(`${tp}.executing`) : t(`${tp}.stale`)}
        </StatusTag>
      ),
    },
    {
      title: t(`${tp}.mission`),
      dataIndex: "name",
      key: "name",
      width: 160,
      render: (v: string | null) => v || "—",
    },
    {
      title: t(`${tp}.car`),
      key: "amrId",
      width: 130,
      render: (_, r) => amrTags(r),
    },
    {
      title: t(`${ts}.station`),
      key: "stationLocationIds",
      width: 125,
      render: (_, r) => stationTags(r),
    },
    {
      title: "",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, row) =>
        row.id ? (
          <Toolbar>
            {toggle(row)}
            <Popconfirm
              title={t("utils.delete_warn")}
              okText={t("utils.confirm")}
              cancelText={t("utils.cancel")}
              onConfirm={() => deleteMutation.mutate(row.id as string)}
            >
              <DangerButton>
                <DeleteOutlined />
              </DangerButton>
            </Popconfirm>
          </Toolbar>
        ) : null,
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ThunderboltOutlined />
          {title}
        </SectionTitle>

        <Hint>{hint}</Hint>
        <Hint>{t(`${ts}.priority_hint`)}</Hint>

        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={3}>
            <Field>
              <FieldLabel>{t(`${tp}.car`)}</FieldLabel>
              <Form.Item
                name="amrId"
                rules={[
                  { required: true, message: t(`${tp}.field_required`) },
                ]}
              >
                <Select
                  mode="multiple"
                  options={amrOptions}
                  placeholder={t("utils.select")}
                  showSearch={filterByLabel}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t(`${tp}.mission`)}</FieldLabel>
              <Form.Item
                name="missionId"
                rules={[
                  { required: true, message: t(`${tp}.field_required`) },
                ]}
              >
                <Select
                  options={missionOptions}
                  placeholder={t("utils.select")}
                  showSearch={filterByLabel}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t(`${ts}.station`)}</FieldLabel>
              <Form.Item name="stationLocationIds">
                <Select
                  mode="multiple"
                  allowClear
                  options={stationOptions}
                  placeholder={t(`${ts}.station_placeholder`)}
                  showSearch={filterByLabel}
                />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Form>

        <Toolbar>
          <SolidButton onClick={submit} disabled={addMutation.isLoading}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>
      </Section>

      <Section>
        <SectionTitle>
          <ThunderboltOutlined />
          {t("utils.missions")}
        </SectionTitle>

        {rows.length === 0 ? (
          <EmptyState>{t("setting_v2.empty.configurations")}</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id ?? row.missionId}>
                <CardTitleRow>
                  <span>{row.name || "—"}</span>
                  <StatusTag $on={!!row.active}>
                    {row.active ? t(`${tp}.executing`) : t(`${tp}.stale`)}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t(`${tp}.car`)}</dt>
                  <dd>{amrTags(row)}</dd>
                  <dt>{t(`${ts}.station`)}</dt>
                  <dd>{stationTags(row)}</dd>
                </CardFacts>

                {row.id && (
                  <Toolbar>
                    {toggle(row)}
                    <Popconfirm
                      title={t("utils.delete_warn")}
                      okText={t("utils.confirm")}
                      cancelText={t("utils.cancel")}
                      onConfirm={() => deleteMutation.mutate(row.id as string)}
                    >
                      <DangerButton>
                        <DeleteOutlined />
                        {t("utils.delete")}
                      </DangerButton>
                    </Popconfirm>
                  </Toolbar>
                )}
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<StationMissionRow>
              size="small"
              rowKey={(r) => r.id ?? (r.missionId as string)}
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 12,
                showTotal: (total) => t("utils.total", { total }),
              }}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default StationMissionPanel;
