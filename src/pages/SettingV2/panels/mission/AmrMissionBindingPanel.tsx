import { FC, ReactNode } from "react";
import { Form, InputNumber, Popconfirm, Select, Skeleton, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  CloseCircleOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
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

export type BindingRow = {
  id: string;
  amrId: string[];
  active: boolean;
  taskName: string;
  taskId: string;
  topicId?: number;
};

type Payload = {
  amrId: string[];
  missionId: string;
  topicId?: number;
};

type Props = {
  title: string;
  icon: ReactNode;
  /** 只有 Topic 任務要填 topic ID */
  withTopicId?: boolean;
  rows: BindingRow[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  endpoints: { add: string; active: string; remove: string };
  /** 各面板的 i18n 前綴,例如 mission.topic_mission */
  i18nPrefix: string;
};

/**
 * 「把任務綁到車輛上」這種設定在 Topic 任務與刪除任務有貨處理兩支面板長得一模一樣,
 * 差別只有多不多一個 topic ID、打哪組 API。與其複製兩份,這裡做成一支共用面板。
 */
const AmrMissionBindingPanel: FC<Props> = ({
  title,
  icon,
  withTopicId,
  rows,
  isLoading,
  isFetching,
  refetch,
  endpoints,
  i18nPrefix,
}) => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const amrOptions = useAmrOptions();
  const missionOptions = useNormalMissionOptions();

  // i18nPrefix 是執行期才知道的字串,i18next 的 key 型別推不出來,這裡明確收斂成 string
  const tp = (key: string): string =>
    t(`${i18nPrefix}.${key}` as Parameters<typeof t>[0]) as string;

  const addMutation = useMutation({
    mutationFn: (payload: Payload) => client.post(endpoints.add, payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      refetch();
      form.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      client.post(endpoints.active, payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post(endpoints.remove, { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const list = rows ?? [];

  const submit = async () => {
    let values: Payload;
    try {
      values = (await form.validateFields()) as Payload;
    } catch {
      return;
    }
    if (
      withTopicId &&
      list.some((v) => v.topicId === Number(values.topicId))
    ) {
      void messageApi.warning(t("mission.topic_mission.topic_duplicate"));
      return;
    }
    addMutation.mutate(values);
  };

  const toggle = (row: BindingRow) =>
    row.active ? (
      <GhostButton
        onClick={() => activeMutation.mutate({ id: row.id, isActive: false })}
      >
        <CloseCircleOutlined />
        {tp("stale")}
      </GhostButton>
    ) : (
      <GhostButton
        onClick={() => activeMutation.mutate({ id: row.id, isActive: true })}
      >
        <PlayCircleOutlined />
        {tp("executing")}
      </GhostButton>
    );

  const columns: TableColumnsType<BindingRow> = [
    {
      title: tp("status"),
      key: "active",
      width: 90,
      fixed: "left",
      filters: [
        { text: tp("executing"), value: true },
        { text: tp("stale"), value: false },
      ],
      onFilter: (value, r) => r.active === value,
      render: (_, r) => (
        <StatusTag $on={r.active}>
          {r.active ? tp("executing") : tp("stale")}
        </StatusTag>
      ),
    },
    {
      title: tp("car"),
      key: "amrId",
      width: 170,
      render: (_, r) => r.amrId.map((a) => <Tag key={a}>{a}</Tag>),
    },
    ...(withTopicId
      ? [
          {
            title: "TOPIC ID",
            dataIndex: "topicId",
            key: "topicId",
            width: 100,
            sorter: (a: BindingRow, b: BindingRow) =>
              (a.topicId ?? 0) - (b.topicId ?? 0),
          },
        ]
      : []),
    {
      title: tp("mission"),
      dataIndex: "taskName",
      key: "taskName",
      width: 200,
    },
    {
      title: "",
      key: "actions",
      width: 170,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          {toggle(row)}
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => deleteMutation.mutate(row.id)}
          >
            <DangerButton>
              <DeleteOutlined />
            </DangerButton>
          </Popconfirm>
        </Toolbar>
      ),
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          {icon}
          {title}
        </SectionTitle>

        <Form form={form} layout="vertical" autoComplete="off">
          <FieldGrid $cols={withTopicId ? 3 : 2}>
            <Field>
              <FieldLabel>{tp("car")}</FieldLabel>
              <Form.Item
                name="amrId"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Select
                  mode="multiple"
                  options={amrOptions}
                  placeholder={t("utils.select")}
                />
              </Form.Item>
            </Field>

            {withTopicId && (
              <Field>
                <FieldLabel>TOPIC ID</FieldLabel>
                <Form.Item
                  name="topicId"
                  rules={[{ required: true, message: t("utils.required") }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Field>
            )}

            <Field>
              <FieldLabel>{tp("mission")}</FieldLabel>
              <Form.Item
                name="missionId"
                rules={[{ required: true, message: t("utils.required") }]}
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
          <GhostButton onClick={refetch} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>
      </Section>

      <Section>
        <SectionTitle>
          {icon}
          {t("utils.missions")}
        </SectionTitle>

        {list.length === 0 ? (
          <EmptyState>NO BINDINGS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {list.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.taskName}</span>
                  <StatusTag $on={row.active}>
                    {row.active ? tp("executing") : tp("stale")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{tp("car")}</dt>
                  <dd>
                    {row.amrId.map((a) => (
                      <Tag key={a}>{a}</Tag>
                    ))}
                  </dd>
                  {withTopicId && (
                    <>
                      <dt>TOPIC ID</dt>
                      <dd>{row.topicId}</dd>
                    </>
                  )}
                </CardFacts>

                <Toolbar>
                  {toggle(row)}
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(row.id)}
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
        ) : (
          <TableWrap>
            <Table<BindingRow>
              size="small"
              rowKey="id"
              dataSource={list}
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

export default AmrMissionBindingPanel;
