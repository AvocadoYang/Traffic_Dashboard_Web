import { FC, useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  AppstoreOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useShelfCategory, {
  ShelfCategoryWithoutList,
} from "@/api/useShelfCategory";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import { c, font, space } from "../../ui/tokens";
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
  WarnNote,
  Hint,
} from "../../ui/primitives";

const LevelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  margin-top: ${space.sm};
`;

const LevelRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md};
  padding: ${space.sm} ${space.md};
  background: ${c.bg};
  border: 1px solid ${c.border};
  font-family: ${font.mono};
  font-size: ${font.sm};
`;

const LevelName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.8px;
  color: ${c.textSecondary};
`;

const LevelValue = styled.span`
  min-width: 70px;
  text-align: right;
  font-weight: 700;
  color: ${c.text};
`;

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid ${({ $danger }) => ($danger ? c.danger : c.border)};
  color: ${({ $danger }) => ($danger ? c.danger : c.textSecondary)};
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $danger }) => ($danger ? c.dangerSoft : c.bgSubtle)};
    border-color: ${({ $danger }) => ($danger ? c.danger : c.borderStrong)};
    color: ${({ $danger }) => ($danger ? c.danger : c.text)};
  }
`;

type EditCategoryPayload = {
  id: string;
  name: string;
  shelf_style: string;
  height: number[] | undefined;
  hasDelete: boolean;
};

const ShelfCategoryPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useShelfCategory();

  const [selectId, setSelectId] = useState<string | null>(null);
  const [cateHeight, setCateHeight] = useState<number[]>([]);
  /** 只要本機動過層高清單就要送 hasDelete,後端才會整批覆寫 */
  const [hasDelete, setHasDelete] = useState(false);
  const [newHeight, setNewHeight] = useState<string>("");

  const rows = (data ?? []) as ShelfCategoryWithoutList[];
  const target = useMemo(
    () => rows.find((v) => v.id === selectId),
    [rows, selectId],
  );

  const styleOptions = [
    { value: "type_1", label: t("edit_shelf_category.type_1") },
    { value: "type_2", label: t("edit_shelf_category.type_2") },
  ];

  const styleLabel = (v: string) =>
    styleOptions.find((o) => o.value === v)?.label ?? "—";

  // 開啟編輯 / 層高送出後重新抓資料時,都以伺服器回來的資料為準重設表單
  useEffect(() => {
    if (!target) return;
    form.setFieldsValue({
      name: target.name,
      shelfStyle: target.shelf_style,
    });
    setCateHeight(target.Height?.map((v) => v?.height ?? 0) ?? []);
  }, [target, form]);

  const invalidate = async () => {
    await queryClient.refetchQueries({ queryKey: ["all-shelf-category"] });
    await queryClient.refetchQueries({ queryKey: ["shelf"] });
  };

  const addMutation = useMutation({
    mutationFn: () => client.post("api/setting/add-shelf-category"),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-shelf-category", { id }),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: EditCategoryPayload) =>
      client.post("api/setting/edit-shelf-category", payload),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
      closeEdit();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  /** 單層高度是直接打 API 改的,不跟著整張表單一起送 */
  const heightMutation = useMutation({
    mutationFn: (payload: { newHeight: number; index: number; shelfId: string }) =>
      client.post("api/setting/edit-shelf-height", payload),
    onSuccess: () => void refetch(),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const closeEdit = () => {
    setSelectId(null);
    setCateHeight([]);
    setHasDelete(false);
    setNewHeight("");
    form.resetFields();
  };

  const addHeight = () => {
    const value = newHeight.trim();
    if (!/^[0-9]+$/.test(value)) {
      void messageApi.warning(t("edit_shelf_category.add_number_warning"));
      return;
    }
    const num = Number(value);
    if (cateHeight.includes(num)) {
      void messageApi.error(t("edit_shelf_category.add_duplicate_warning"));
      return;
    }
    setCateHeight([...cateHeight, num].sort((a, b) => a - b));
    setHasDelete(true);
    setNewHeight("");
  };

  const removeHeight = (value: number) => {
    setCateHeight(cateHeight.filter((o) => o !== value));
    setHasDelete(true);
  };

  const submit = async () => {
    if (!selectId) return;
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue() as {
      name: string;
      shelfStyle: string;
    };
    editMutation.mutate({
      id: selectId,
      name: values.name,
      shelf_style: values.shelfStyle,
      height: cateHeight,
      hasDelete,
    });
  };

  const heightsText = (record: ShelfCategoryWithoutList) =>
    [...(record.Height ?? [])]
      .sort((a, b) => a.height - b.height)
      .map((k) => k.height)
      .join(" / ") || "—";

  const columns: TableColumnsType<ShelfCategoryWithoutList> = [
    {
      title: t("edit_shelf_category.name"),
      dataIndex: "name",
      key: "name",
      width: 150,
      fixed: "left",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("edit_shelf_category.style"),
      dataIndex: "shelf_style",
      key: "shelf_style",
      width: 110,
      render: (v: string) => styleLabel(v),
    },
    {
      title: t("edit_shelf_category.every_level"),
      key: "height",
      width: 180,
      render: (_, record) => heightsText(record),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, record) => (
        <Toolbar>
          <GhostButton onClick={() => setSelectId(record.id)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("edit_shelf_category.delete_warning")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => deleteMutation.mutate(record.id)}
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
          <AppstoreOutlined />
          {t("edit_shelf_category.edit_shelf_category")}
        </SectionTitle>

        <WarnNote>{t("edit_shelf_panel.warn")}</WarnNote>

        <Toolbar>
          <SolidButton
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isLoading}
          >
            <PlusOutlined />
            {t("edit_shelf_category.add_shelf")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO CATEGORIES</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.name}</span>
                  <Tag>{styleLabel(row.shelf_style)}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("edit_shelf_category.every_level")}</dt>
                  <dd>{heightsText(row)}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => setSelectId(row.id)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("edit_shelf_category.delete_warning")}
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
            <Table<ShelfCategoryWithoutList>
              size="small"
              rowKey="id"
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
        open={!!selectId}
        title={`${t("utils.edit")} — ${target?.name ?? ""}`}
        onCancel={closeEdit}
        onOk={submit}
        confirmLoading={editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("edit_shelf_category.name")}</FieldLabel>
            <Form.Item
              name="name"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("edit_shelf_category.style")}</FieldLabel>
            <Form.Item
              name="shelfStyle"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select options={styleOptions} />
            </Form.Item>
          </Field>
        </Form>

        <FieldLabel>{t("edit_shelf_category.every_level")}</FieldLabel>
        <Toolbar style={{ marginTop: 8 }}>
          <InputNumber
            min={0}
            value={newHeight === "" ? null : Number(newHeight)}
            onChange={(v) => setNewHeight(v === null ? "" : String(v))}
            onPressEnter={addHeight}
            placeholder="0"
            style={{ flex: 1 }}
          />
          <SolidButton onClick={addHeight}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
        </Toolbar>

        {cateHeight.length === 0 ? (
          <EmptyState style={{ marginTop: 12 }}>
            {t("utils.none")}
          </EmptyState>
        ) : (
          <LevelList>
            {cateHeight.map((v, i) => (
              <HeightRow
                key={`${v}-${i}`}
                value={v}
                index={i}
                onSave={(next) =>
                  selectId &&
                  heightMutation.mutate({
                    newHeight: next,
                    index: i,
                    shelfId: selectId,
                  })
                }
                onDelete={() => removeHeight(v)}
              />
            ))}
          </LevelList>
        )}

        <Hint style={{ marginTop: 12 }}>
          {t("edit_shelf_category.delete_warning")}
        </Hint>
      </Modal>
    </PanelShell>
  );
};

const HeightRow: FC<{
  value: number;
  index: number;
  onSave: (next: number) => void;
  onDelete: () => void;
}> = ({ value, index, onSave, onDelete }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    setEditing(false);
    onSave(draft);
  };

  return (
    <LevelRow>
      <LevelName>
        {t("edit_shelf_category.f1")}
        {index + 1}
        {t("edit_shelf_category.f2")}
      </LevelName>

      {editing ? (
        <InputNumber
          min={1}
          value={draft}
          onChange={(e) => setDraft(Number(e ?? 0))}
          onPressEnter={save}
          style={{ width: 110 }}
        />
      ) : (
        <LevelValue>{value} mm</LevelValue>
      )}

      {editing ? (
        <IconBtn onClick={save} title={t("utils.save")}>
          <CheckOutlined />
        </IconBtn>
      ) : (
        <IconBtn
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          title={t("utils.edit")}
        >
          <EditOutlined />
        </IconBtn>
      )}

      <Popconfirm
        title={t("edit_shelf_category.delete_warning")}
        okText={t("utils.confirm")}
        cancelText={t("utils.cancel")}
        onConfirm={onDelete}
      >
        <IconBtn $danger title={t("utils.delete")}>
          <DeleteOutlined />
        </IconBtn>
      </Popconfirm>
    </LevelRow>
  );
};

export default ShelfCategoryPanel;
