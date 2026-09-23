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
  AimOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useBlindMission from "@/api/useBlindMission";
import { EBLM } from "@/pages/Setting/utils/settingJotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import MissionTableSelect from "@/pages/Main/components/missionModal/MissionTableSelect";
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

type BlindRow = {
  id: string;
  name?: string | null;
  locationId: string;
  bind_mission?: { id: string; name?: string | null } | null;
};

const BlindLocationPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data, isLoading, isFetching, refetch } = useBlindMission();
  // 編輯用的 Modal 是掛在 MapView 底下的,這裡只負責把它打開
  const openEditModal = useSetAtom(EBLM);

  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [pickedMission, setPickedMission] = useState("");

  const rows = useMemo(() => {
    const all = (data ?? []) as BlindRow[];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (item) =>
        item.name?.toLowerCase().includes(keyword) ||
        item.locationId.toLowerCase().includes(keyword) ||
        item.bind_mission?.name?.toLowerCase().includes(keyword),
    );
  }, [data, search]);

  /** 已經綁過任務的地點不能再新增,要用表格裡的編輯改 */
  const unboundOptions = useMemo(
    () =>
      ((data ?? []) as BlindRow[])
        .filter((item) => !item.bind_mission)
        .map((item) => ({ label: item.locationId, value: item.locationId })),
    [data],
  );

  const saveMutation = useMutation({
    mutationFn: (payload: {
      locationId: string;
      missionTitleId: string;
      name: string;
    }) => client.post("api/setting/blind-location-mission", payload),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({ queryKey: ["all-blind-missions"] });
      closeAdd();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-blind-location-mission", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const closeAdd = () => {
    form.resetFields();
    setPickedMission("");
    setOpenAdd(false);
  };

  const submitAdd = async () => {
    let values: { locationId: string; missionTitleId: string; name: string };
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }
    saveMutation.mutate(values);
  };

  const columns: TableColumnsType<BlindRow> = [
    {
      title: t("blind_location.locationId"),
      dataIndex: "locationId",
      key: "locationId",
      width: 110,
      fixed: "left",
      sorter: (a, b) => Number(a.locationId) - Number(b.locationId),
    },
    {
      title: t("blind_location.location_name"),
      dataIndex: "name",
      key: "name",
      width: 160,
      render: (v: string | null) => v || "—",
    },
    {
      title: t("blind_location.mission"),
      key: "bind_mission",
      width: 200,
      render: (_, r) => r.bind_mission?.name || t("utils.none"),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton
            onClick={() =>
              openEditModal({ locationId: row.locationId, isOpen: true })
            }
          >
            <EditOutlined />
          </GhostButton>
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
          <AimOutlined />
          {t("mission.blind_mission.title")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("blind_location.location_name")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <SolidButton
            onClick={() => setOpenAdd(true)}
            disabled={unboundOptions.length === 0}
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
          新增只能選還沒綁過任務的地點,已綁定的請用清單上的編輯修改。
        </Hint>

        {rows.length === 0 ? (
          <EmptyState>NO BLIND LOCATIONS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.name || row.locationId}</span>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("blind_location.locationId")}</dt>
                  <dd>{row.locationId}</dd>
                  <dt>{t("blind_location.mission")}</dt>
                  <dd>{row.bind_mission?.name || t("utils.none")}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton
                    onClick={() =>
                      openEditModal({
                        locationId: row.locationId,
                        isOpen: true,
                      })
                    }
                  >
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
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
            <Table<BlindRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 12,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={openAdd}
        title={t("mission.blind_mission.title")}
        onCancel={closeAdd}
        onOk={submitAdd}
        confirmLoading={saveMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("blind_location.locationId")}</FieldLabel>
            <Form.Item
              name="locationId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                options={unboundOptions}
                showSearch
                placeholder={t("utils.select")}
              />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("blind_location.location_name")}</FieldLabel>
            <Form.Item
              name="name"
              rules={[
                { required: true, message: t("utils.required") },
                { pattern: /^\S+$/, message: t("utils.required") },
              ]}
            >
              <Input />
            </Form.Item>
          </Field>

          <Field>
            <FieldLabel>{t("blind_location.mission")}</FieldLabel>
            <Form.Item
              name="missionTitleId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <MissionTableSelect
                onSelect={(record) => {
                  form.setFieldValue("missionTitleId", record.id);
                  setPickedMission(record.name);
                }}
                placeholder={pickedMission}
              />
            </Form.Item>
          </Field>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default BlindLocationPanel;
