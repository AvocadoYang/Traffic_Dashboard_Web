import { FC, useMemo, useState } from "react";
import {
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  BorderOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { useFootprint } from "@/api/useFootprint";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  FootprintEditor,
  FootprintRecord,
} from "@/pages/Setting/formComponent/forms/missionComponents/mir/footprinter/FootprintEditor";
import { useTranslation } from "react-i18next";
import useIsNarrow from "../../ui/useIsNarrow";
import {
  PanelShell,
  Section,
  SectionTitle,
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

type ProductKey = "MIR250";

const PRODUCT_LABEL: Record<ProductKey, string> = { MIR250: "MiR250" };

/** 新建時先套用機型的預設外框,再進編輯器微調 */
const PRODUCT_TEMPLATE: Record<ProductKey, { points: string; height: number }> =
  {
    MIR250: {
      points: "[[0.54,-0.38],[0.54,0.38],[-0.54,0.38],[-0.54,-0.38]]",
      height: 1.4,
    },
  };

type FootprintRow = {
  id?: string;
  name: string;
  config_id: ProductKey;
  height: number;
  footprint_points: string;
};

const FootprintPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data = [], isLoading, isFetching, refetch } = useFootprint();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  /** 有值就顯示編輯器,沒有就顯示清單 */
  const [editingRow, setEditingRow] = useState<FootprintRow | null>(null);

  // 後端的 height 是字串,編輯器與排序都要數字,在這裡一次轉好
  const rows = useMemo(() => {
    const all: FootprintRow[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      config_id: r.config_id as ProductKey,
      height: Number(r.height),
      footprint_points: r.footprint_points,
    }));
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter((r) => r.name.toLowerCase().includes(keyword));
  }, [data, search]);

  const createMutation = useMutation({
    mutationFn: (payload: FootprintRow) =>
      client.post<{ ok: string; id: string }>(
        "api/setting/create-footprint",
        payload,
      ),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: FootprintRow) =>
      client.post("api/setting/edit-footprint", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-footprint", { id }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({ queryKey: ["footprint"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submitCreate = async () => {
    let values: { name: string; config_id: ProductKey };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }
    const template = PRODUCT_TEMPLATE[values.config_id];
    const newRow: FootprintRow = {
      name: values.name.trim(),
      config_id: values.config_id,
      height: template.height,
      footprint_points: template.points,
    };

    try {
      // 等後端真的建好、回傳 id 之後才離開對話框進編輯器
      const res = await createMutation.mutateAsync(newRow);
      setCreateOpen(false);
      form.resetFields();
      setEditingRow({ ...newRow, id: res.data?.id });
    } catch {
      // createMutation 的 onError 已經顯示原因(例如名稱重複),留在對話框讓使用者改
    }
  };

  const saveFromEditor = async (next: FootprintRecord) => {
    if (!editingRow?.id) {
      void messageApi.error(t("utils.error"));
      return;
    }
    try {
      await editMutation.mutateAsync({
        ...next,
        id: editingRow.id,
      } as FootprintRow);
      setEditingRow(null);
    } catch {
      // 留在編輯器,不要讓使用者失去正在編輯的內容
    }
  };

  const columns: TableColumnsType<FootprintRow> = [
    {
      title: t("peripheral_name_table.name"),
      dataIndex: "name",
      key: "name",
      width: 200,
      fixed: "left",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("utils.category"),
      dataIndex: "config_id",
      key: "config_id",
      width: 120,
      render: (v: ProductKey) => <Tag>{PRODUCT_LABEL[v] ?? v}</Tag>,
    },
    {
      title: t("toolbar.amr_setting.height"),
      dataIndex: "height",
      key: "height",
      width: 100,
      sorter: (a, b) => a.height - b.height,
      render: (v: number) => `${v} m`,
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => setEditingRow(row)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => row.id && deleteMutation.mutate(row.id)}
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

  // 編輯器是獨立的畫布介面,佔滿整個面板,由它自己負責返回
  if (editingRow) {
    return (
      <PanelShell>
        <FootprintEditor
          data={{
            id: editingRow.id,
            name: editingRow.name,
            config_id: editingRow.config_id,
            footprint_points: editingRow.footprint_points,
            height: editingRow.height,
          }}
          onBack={() => setEditingRow(null)}
          onSave={saveFromEditor}
          messageApi={messageApi}
        />
        {contextHolder}
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <BorderOutlined />
          FOOTPRINT
        </SectionTitle>

        <Hint>定義車輛的外框形狀,供避障與路徑規劃使用。</Hint>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("utils.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <SolidButton onClick={() => setCreateOpen(true)}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO FOOTPRINTS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id ?? row.name}>
                <CardTitleRow>
                  <span>{row.name}</span>
                  <Tag>{PRODUCT_LABEL[row.config_id] ?? row.config_id}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("toolbar.amr_setting.height")}</dt>
                  <dd>{row.height} m</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => setEditingRow(row)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => row.id && deleteMutation.mutate(row.id)}
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
            <Table<FootprintRow>
              size="small"
              rowKey={(r) => r.id ?? r.name}
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

      <Modal
        open={createOpen}
        title={`${t("utils.add")} — FOOTPRINT`}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={submitCreate}
        confirmLoading={createMutation.isLoading}
        okText={t("utils.confirm")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Hint style={{ marginBottom: 12 }}>
          先填名稱與機型,建立後會直接進入外框編輯器調整形狀。
        </Hint>

        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          initialValues={{ config_id: "MIR250" }}
        >
          <Field>
            <FieldLabel>{t("peripheral_name_table.name")}</FieldLabel>
            <Form.Item
              name="name"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("utils.category")}</FieldLabel>
            <Form.Item
              name="config_id"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                options={Object.entries(PRODUCT_LABEL).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default FootprintPanel;
