import { FC, useState } from "react";
import {
  ColorPicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Skeleton,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useCategory from "@/api/useCategory";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
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
  Hint,
} from "../../ui/primitives";

type TagRow = {
  id: string;
  tagName: string;
  color: string;
};

/** 這幾個標籤是系統行為的依據,改名或刪掉會讓對應的任務分類失效 */
const PROTECTED_TAGS = ["none", "dynamic-mission", "normal-mission", "charge"];

const isProtected = (tagName: string) => PROTECTED_TAGS.includes(tagName);

const colorDot = (bg: string) => (
  <span
    style={{
      display: "inline-block",
      width: 14,
      height: 14,
      border: "1px solid #c8c8c8",
      background: bg,
      verticalAlign: "middle",
      marginRight: 6,
    }}
  />
);

const TagPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useCategory();
  const [editing, setEditing] = useState<TagRow | null>(null);

  const rows = (data ?? []) as TagRow[];

  const addMutation = useMutation({
    mutationFn: () => client.post("api/setting/add-category"),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: TagRow) =>
      client.post("api/setting/edit-category", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
      setEditing(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-category", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const openEdit = (row: TagRow) => {
    if (isProtected(row.tagName)) {
      void messageApi.warning(t("other.edit_mission_tag.forbidden_edit_default"));
      return;
    }
    form.setFieldsValue({ tagName: row.tagName, color: row.color });
    setEditing(row);
  };

  const remove = (row: TagRow) => {
    if (isProtected(row.tagName)) {
      void messageApi.warning(t("other.edit_mission_tag.forbidden_edit_default"));
      return;
    }
    deleteMutation.mutate(row.id);
  };

  const submit = async () => {
    if (!editing) return;
    let values: { tagName: string; color: string | { toHexString(): string } };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }
    // ColorPicker 沒被動過時給的是原本的字串,動過才會是 Color 物件
    const color =
      typeof values.color === "string"
        ? values.color
        : values.color.toHexString();

    editMutation.mutate({ id: editing.id, tagName: values.tagName, color });
  };

  const columns: TableColumnsType<TagRow> = [
    {
      title: t("other.edit_mission_tag.tag"),
      dataIndex: "tagName",
      key: "tagName",
      width: 220,
      fixed: "left",
      sorter: (a, b) => a.tagName.localeCompare(b.tagName),
    },
    {
      title: t("other.edit_mission_tag.color"),
      dataIndex: "color",
      key: "color",
      width: 130,
      render: (v: string) => (
        <>
          {colorDot(v)}
          {v}
        </>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, row) =>
        isProtected(row.tagName) ? (
          <Hint>{t("other.edit_mission_tag.forbidden_edit_default")}</Hint>
        ) : (
          <Toolbar>
            <GhostButton onClick={() => openEdit(row)}>
              <EditOutlined />
            </GhostButton>
            <Popconfirm
              title={t("utils.delete_warn")}
              okText={t("utils.yes")}
              cancelText={t("utils.no")}
              onConfirm={() => remove(row)}
            >
              <DangerButton>
                <DeleteOutlined />
              </DangerButton>
            </Popconfirm>
          </Toolbar>
        ),
    },
  ];

  const legend = (
    <CardFacts style={{ maxWidth: 420 }}>
      <dt>charge</dt>
      <dd>{t("mission.add_mission.charge")}</dd>
      <dt>force</dt>
      <dd>{t("mission.add_mission.force")}</dd>
      <dt>normal-mission</dt>
      <dd>{t("mission.add_mission.normal_mission_tag_description")}</dd>
      <dt>dynamic-mission</dt>
      <dd>{t("mission.add_mission.dynamic_mission_tag_description")}</dd>
    </CardFacts>
  );

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <TagsOutlined />
          {t("other.edit_mission_tag.title")}
          <Popover trigger="click" content={legend}>
            <InfoCircleOutlined style={{ cursor: "pointer" }} />
          </Popover>
        </SectionTitle>

        <Toolbar>
          <SolidButton
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isLoading}
          >
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        <Hint>
          新增會先建立一筆預設標籤,再按編輯改名稱與顏色。
          系統預設的四個標籤不能修改或刪除。
        </Hint>

        {rows.length === 0 ? (
          <EmptyState>NO TAGS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>
                    {colorDot(row.color)}
                    {row.tagName}
                  </span>
                </CardTitleRow>

                {isProtected(row.tagName) ? (
                  <Hint>
                    {t("other.edit_mission_tag.forbidden_edit_default")}
                  </Hint>
                ) : (
                  <Toolbar>
                    <GhostButton onClick={() => openEdit(row)}>
                      <EditOutlined />
                      {t("utils.edit")}
                    </GhostButton>
                    <Popconfirm
                      title={t("utils.delete_warn")}
                      okText={t("utils.yes")}
                      cancelText={t("utils.no")}
                      onConfirm={() => remove(row)}
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
            <Table<TagRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 15,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editing}
        title={`${t("utils.edit")} — ${editing?.tagName ?? ""}`}
        onCancel={() => setEditing(null)}
        onOk={submit}
        confirmLoading={editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("other.edit_mission_tag.tag")}</FieldLabel>
            <Form.Item
              name="tagName"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("other.edit_mission_tag.color")}</FieldLabel>
            <Form.Item
              name="color"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <ColorPicker format="hex" showText />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default TagPanel;
