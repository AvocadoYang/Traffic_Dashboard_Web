import { FC } from "react";
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
import useBLCS from "@/api/useBeforeleftChargeStation";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import useAmrOptions from "../../ui/useAmrOptions";
import useNormalMissionOptions from "../../ui/useNormalMissionOptions";
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
} from "../../ui/primitives";

type BlcsRow = {
  id?: string;
  active?: boolean;
  amrId?: (string | undefined)[];
  missionId?: string;
  name?: string;
};

const tp = "mission.before_left_charge_station_mission";

const BeforeLeftChargeStationPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useBLCS();
  const amrOptions = useAmrOptions();
  const missionOptions = useNormalMissionOptions();

  const rows = (data ?? []) as BlcsRow[];

  const addMutation = useMutation({
    mutationFn: (payload: { amrId: string[]; missionId: string }) =>
      client.post("api/setting/add-BLCS", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
      form.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      client.post("api/setting/active-BLCS", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/delete-BLCS", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = async () => {
    let values: { amrId: string[]; missionId: string };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }
    addMutation.mutate(values);
  };

  /** 表格顯示車輛時去掉機種前綴,只留編號,跟 v1 一致 */
  const shortAmr = (full: string) => full.split("-").slice(1).join("-") || full;

  const toggle = (row: BlcsRow) => {
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

  const columns: TableColumnsType<BlcsRow> = [
    {
      title: t(`${tp}.status`),
      key: "active",
      width: 90,
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
      width: 200,
    },
    {
      title: t(`${tp}.car`),
      key: "amrId",
      width: 180,
      render: (_, r) =>
        r.amrId?.length
          ? r.amrId.map((a, i) => (
              <Tag key={`${a}-${i}`}>{shortAmr(a ?? "")}</Tag>
            ))
          : "—",
    },
    {
      title: "",
      key: "actions",
      width: 170,
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
          {t(`${tp}.before_left_charge_station_mission`)}
        </SectionTitle>

        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={2}>
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
                  showSearch={{
                    filterOption: (input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase()),
                  }}
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
                  showSearch={{
                    filterOption: (input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase()),
                  }}
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
          <EmptyState>NO CONFIGURATIONS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id ?? row.missionId}>
                <CardTitleRow>
                  <span>{row.name}</span>
                  <StatusTag $on={!!row.active}>
                    {row.active ? t(`${tp}.executing`) : t(`${tp}.stale`)}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t(`${tp}.car`)}</dt>
                  <dd>
                    {row.amrId?.length
                      ? row.amrId.map((a, i) => (
                          <Tag key={`${a}-${i}`}>{shortAmr(a ?? "")}</Tag>
                        ))
                      : "—"}
                  </dd>
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
            <Table<BlcsRow>
              size="small"
              rowKey={(r) => r.id ?? (r.missionId as string)}
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default BeforeLeftChargeStationPanel;
