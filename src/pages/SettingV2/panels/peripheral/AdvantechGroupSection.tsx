import { FC, useState } from "react";
import { Form, Input, Modal, Popconfirm, Select, message } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClusterOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { AdvantechGroupRow, AdvantechRow } from "@/api/useAdvantech";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { c, font, space } from "../../ui/tokens";
import {
  Section,
  SectionTitle,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  Hint,
  EmptyState,
  Tag,
} from "../../ui/primitives";
import AdvantechIo, {
  DeviceCard,
  DeviceGrid,
  DeviceName,
  DeviceSub,
  IO_COUNT,
} from "./AdvantechIo";

type GroupForm = { name: string; note: string; moduleIds: string[] };

const MemberTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${space.xs};
`;

/** 對話框裡排順序的清單: 第幾台、名稱、IP、IO 範圍、上移 / 下移 */
const OrderList = styled.ol`
  margin: 0 0 ${space.md};
  padding: 0;
  list-style: none;
  border: 1px solid ${c.border};
  border-radius: 4px;
`;

const OrderItem = styled.li`
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.xs} ${space.sm};
  font-size: ${font.sm};

  & + & {
    border-top: 1px solid ${c.border};
  }
`;

const OrderIndex = styled.span`
  font-family: ${font.mono};
  color: ${c.textMuted};
`;

const OrderName = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
  color: ${c.text};

  small {
    margin-left: ${space.xs};
    font-family: ${font.mono};
    color: ${c.textMuted};
  }
`;

const OrderButtons = styled.span`
  display: inline-flex;
  gap: 2px;
`;

type Props = {
  devices: AdvantechRow[];
  groups: AdvantechGroupRow[];
  /** 群組改了, 模組的 groupId 也跟著變, 兩邊都要重抓 */
  onChanged: () => void;
};

/**
 * 模組群組: 好幾台 ADAM 模組合成一個設備 (例如電梯 8 IN 8 OUT = 兩台 4 IN 4 OUT)。
 * 一台模組只能在一個群組; 群組裡的順序就是畫面上排的順序, 每台模組的 IO 還是自己的 0–3。
 */
const AdvantechGroupSection: FC<Props> = ({ devices, groups, onChanged }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<GroupForm>();
  const [editing, setEditing] = useState<AdvantechGroupRow | null>(null);
  const [open, setOpen] = useState(false);
  const moduleIds = Form.useWatch("moduleIds", form) ?? [];

  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    onChanged();
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const saveMutation = useMutation({
    mutationFn: (payload: GroupForm & { id?: string }) =>
      payload.id
        ? client.post("api/setting/edit-advantech-group", payload)
        : client.post("api/setting/add-advantech-group", payload),
    onSuccess: () => {
      onDone();
      setOpen(false);
    },
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-advantech-group", { id }),
    onSuccess: onDone,
    onError,
  });

  const openEdit = (group: AdvantechGroupRow | null) => {
    setEditing(group);
    form.setFieldsValue(
      group
        ? {
            name: group.name,
            note: group.note,
            moduleIds: group.modules.map((m) => m.id),
          }
        : { name: "", note: "", moduleIds: [] },
    );
    setOpen(true);
  };

  const move = (index: number, delta: number) => {
    const next = [...moduleIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    form.setFieldValue("moduleIds", next);
  };

  const submit = async () => {
    let values: GroupForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    saveMutation.mutate({
      name: values.name.trim(),
      note: (values.note ?? "").trim(),
      moduleIds: values.moduleIds,
      id: editing?.id,
    });
  };

  // 已經在別的群組的模組也能選, 存檔後會搬過來; 選項上標出它現在在哪
  const moduleOptions = devices.map((d) => {
    const otherGroup =
      d.groupId && d.groupId !== editing?.id
        ? groupNameById.get(d.groupId)
        : undefined;
    return {
      value: d.id,
      label: otherGroup
        ? `${d.name} (${d.ip}) · ${t("advantech.group.in_group", { name: otherGroup })}`
        : `${d.name} (${d.ip})`,
    };
  });

  const movingOut = moduleIds
    .map((id) => deviceById.get(id))
    .filter((d) => d?.groupId && d.groupId !== editing?.id);

  return (
    <Section>
      {contextHolder}
      <SectionTitle>
        <ClusterOutlined />
        {t("advantech.group.title")}
      </SectionTitle>
      <Hint>{t("advantech.group.hint")}</Hint>
      <Toolbar>
        <SolidButton onClick={() => openEdit(null)} disabled={!devices.length}>
          <PlusOutlined />
          {t("advantech.group.add")}
        </SolidButton>
      </Toolbar>

      {groups.length === 0 ? (
        <EmptyState>{t("advantech.group.empty")}</EmptyState>
      ) : (
        <DeviceGrid $min={420}>
          {groups.map((group) => {
            const ioTotal = group.modules.length * IO_COUNT;
            return (
              <DeviceCard key={group.id}>
                <DeviceName>{group.name}</DeviceName>
                <DeviceSub>
                  {t("advantech.group.io_summary", {
                    n: group.modules.length,
                    io: ioTotal,
                  })}
                </DeviceSub>
                {group.note && <Hint>{group.note}</Hint>}
                <MemberTags>
                  {group.modules.map((m, i) => (
                    <Tag key={m.id} title={m.ip}>
                      {m.name}
                    </Tag>
                  ))}
                </MemberTags>
                {group.modules.length > 0 ? (
                  <AdvantechIo modules={group.modules} showModuleNames />
                ) : (
                  <Hint>{t("advantech.group.no_modules")}</Hint>
                )}
                <Toolbar>
                  <GhostButton onClick={() => openEdit(group)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("advantech.group.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(group.id)}
                  >
                    <DangerButton>
                      <DeleteOutlined />
                      {t("utils.delete")}
                    </DangerButton>
                  </Popconfirm>
                </Toolbar>
              </DeviceCard>
            );
          })}
        </DeviceGrid>
      )}

      <Modal
        open={open}
        title={editing ? t("advantech.group.edit") : t("advantech.group.add")}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        forceRender
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("advantech.group.name")}</FieldLabel>
            <Form.Item
              name="name"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t("utils.required"),
                },
              ]}
            >
              <Input
                maxLength={100}
                placeholder={t("advantech.group.name_placeholder")}
              />
            </Form.Item>
          </Field>
          <Field>
            <FieldLabel>{t("advantech.group.modules")}</FieldLabel>
            <Form.Item
              name="moduleIds"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                mode="multiple"
                options={moduleOptions}
                optionFilterProp="label"
                placeholder={t("utils.select")}
              />
            </Form.Item>
          </Field>

          {moduleIds.length > 0 && (
            <>
              <FieldLabel>{t("advantech.group.order")}</FieldLabel>
              <Hint>{t("advantech.group.order_hint")}</Hint>
              <OrderList>
                {moduleIds.map((id, i) => {
                  const d = deviceById.get(id);
                  return (
                    <OrderItem key={id}>
                      <OrderIndex>{i + 1}</OrderIndex>
                      <OrderName>
                        {d?.name ?? id}
                        <small>{d?.ip}</small>
                      </OrderName>
                      <OrderButtons>
                        <GhostButton
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label="up"
                        >
                          <ArrowUpOutlined />
                        </GhostButton>
                        <GhostButton
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === moduleIds.length - 1}
                          aria-label="down"
                        >
                          <ArrowDownOutlined />
                        </GhostButton>
                      </OrderButtons>
                    </OrderItem>
                  );
                })}
              </OrderList>
            </>
          )}

          {movingOut.length > 0 && (
            <Hint>
              {t("advantech.group.move_warn", {
                names: movingOut.map((d) => d?.name).join(", "),
              })}
            </Hint>
          )}

          <Field>
            <FieldLabel>{t("advantech.group.note")}</FieldLabel>
            <Form.Item name="note">
              <Input.TextArea
                maxLength={500}
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </Section>
  );
};

export default AdvantechGroupSection;
