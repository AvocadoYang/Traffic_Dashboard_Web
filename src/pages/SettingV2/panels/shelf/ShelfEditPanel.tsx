import { FC, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Table,
  Tooltip,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DownOutlined,
  EditOutlined,
  GoldOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useShelf from "@/api/useShelf";
import useShelfCategory from "@/api/useShelfCategory";
import useYaw from "@/api/useYaw";
import useAllMissionTitles from "@/api/useMissionTitle";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { ShelfWithoutList } from "@/api/type/useShelf";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import ShelfConfigDetail from "./ShelfConfigDetail";
import {
  PanelShell,
  Section,
  SectionTitle,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  WarnNote,
  CountNote,
} from "../../ui/primitives";

type EditPayload = {
  shelfId: React.Key[];
  category?: string;
  load?: string;
  offload?: string;
  cargo_limit?: number;
  placement_priority?: number;
  relationships?: { relatedLocId: string; relationshipType: string }[];
};

const ShelfEditPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data: shelfData, isLoading, isFetching, refetch } = useShelf();
  const { data: yaw } = useYaw();
  const { data: allCategory } = useShelfCategory();
  const { data: missionTitle } = useAllMissionTitles();
  const { data: locData } = useLoc(undefined);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [search, setSearch] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  /** 卡片模式下展開詳細資訊的那幾筆 */
  const [expanded, setExpanded] = useState<string[]>([]);

  const rows = useMemo(() => {
    const all = (shelfData ?? []) as unknown as ShelfWithoutList[];
    const sorted = [...all].sort(
      (a, b) => Number(a.Loc.locationId) - Number(b.Loc.locationId),
    );
    const keyword = search.trim().toLowerCase();
    if (!keyword) return sorted;
    return sorted.filter((s) =>
      s.Loc.locationId.toLowerCase().includes(keyword),
    );
  }, [shelfData, search]);

  const locList = (locData ?? []) as LocWithoutArr[];

  /** 只有掛在 dynamic-mission 底下的任務才能當取放貨任務 */
  const misOptions = useMemo(
    () =>
      missionTitle
        ?.filter((g) =>
          g.MissionTitleBridgeCategory.some(
            (s) => s.Category?.tagName === "dynamic-mission",
          ),
        )
        .map((v) => ({ value: v.id, label: v.name })) ?? [],
    [missionTitle],
  );

  const relationOption = useMemo(
    () =>
      locList
        .filter((v) => v.areaType === "STORAGE")
        .sort((a, b) => Number(a.locationId) - Number(b.locationId))
        .map((v) => ({ label: v.locationId, value: v.locationId })),
    [locList],
  );

  const relationshipTypeOption = [
    { value: "fixed", label: t("shelf.cargo_mission.relationship_fixed") },
    {
      value: "non-fixed",
      label: t("shelf.cargo_mission.relationship_non_fixed"),
    },
  ];

  const yawOf = (dirId: string | null | undefined) => {
    const hit = yaw?.find((s) => s.id === dirId);
    return hit ? String(hit.yaw) : "—";
  };

  const submitMutation = useMutation({
    mutationFn: (payload: EditPayload) =>
      client.post("api/setting/edit-multi-shelf", payload),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["shelf"] });
      await queryClient.refetchQueries({ queryKey: ["loc-only"] });
      void messageApi.success(t("utils.success"));
      setOpenEdit(false);
      form.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue() as Omit<EditPayload, "shelfId">;
    submitMutation.mutate({ ...values, shelfId: selectedRowKeys });
  };

  const toggleCard = (id: string) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const toggleSelect = (id: string) =>
    setSelectedRowKeys((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const columns: TableColumnsType<ShelfWithoutList> = [
    {
      title: t("edit_shelf_panel.location_id"),
      key: "locationId",
      width: 90,
      fixed: "left",
      defaultSortOrder: "ascend",
      sorter: (a, b) => Number(a.Loc.locationId) - Number(b.Loc.locationId),
      render: (_, r) => r.Loc.locationId,
    },
    {
      title: t("edit_shelf_panel.category"),
      key: "category",
      width: 130,
      render: (_, r) => r.ShelfCategory?.name ?? t("utils.none"),
    },
    {
      title: t("edit_shelf_panel.level"),
      key: "level",
      width: 90,
      render: (_, r) =>
        r.ShelfConfig ? (r.ShelfCategory?.Height?.length ?? 0) : 0,
    },
    {
      title: t("edit_shelf_panel.yaw"),
      key: "yaw",
      width: 80,
      render: (_, r) => yawOf(r.Loc.dirId),
    },
    {
      title: t("edit_shelf_panel.placement_priority"),
      key: "priority",
      width: 90,
      render: (_, r) =>
        locList.find((l) => l.locationId === r.Loc.locationId)
          ?.placement_priority ?? t("utils.none"),
    },
    {
      title: t("edit_shelf_panel.region_name"),
      key: "region_name",
      width: 120,
      render: (_, r) => r.Loc?.loc_regions?.name || "—",
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <GoldOutlined />
          {t("edit_shelf_panel.edit_shelf")}
        </SectionTitle>

        <WarnNote>{t("edit_shelf_panel.warn")}</WarnNote>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("edit_shelf_panel.location_id")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <SolidButton
            onClick={() => setOpenEdit(true)}
            disabled={selectedRowKeys.length === 0}
          >
            <EditOutlined />
            {t("utils.edit")}
          </SolidButton>
          <GhostButton
            onClick={() => setSelectedRowKeys([])}
            disabled={selectedRowKeys.length === 0}
          >
            {t("utils.reset")}
          </GhostButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
          <CountNote>
            {selectedRowKeys.length} / {rows.length}
          </CountNote>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO SHELVES</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => {
              const isOpen = expanded.includes(row.id);
              return (
                <ItemCard
                  key={row.id}
                  $selected={selectedRowKeys.includes(row.id)}
                >
                  <CardTitleRow>
                    <Checkbox
                      checked={selectedRowKeys.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                    >
                      {row.Loc.locationId}
                    </Checkbox>
                    <Tag>{row.ShelfCategory?.name ?? t("utils.none")}</Tag>
                  </CardTitleRow>

                  <CardFacts>
                    <dt>{t("edit_shelf_panel.level")}</dt>
                    <dd>{row.ShelfCategory?.Height?.length ?? 0}</dd>
                    <dt>{t("edit_shelf_panel.yaw")}</dt>
                    <dd>{yawOf(row.Loc.dirId)}</dd>
                    <dt>{t("edit_shelf_panel.placement_priority")}</dt>
                    <dd>
                      {locList.find((l) => l.locationId === row.Loc.locationId)
                        ?.placement_priority ?? t("utils.none")}
                    </dd>
                  </CardFacts>

                  <Toolbar>
                    <GhostButton onClick={() => toggleCard(row.id)}>
                      {isOpen ? <DownOutlined /> : <RightOutlined />}
                      {t("edit_shelf_panel.detail")}
                    </GhostButton>
                  </Toolbar>

                  {isOpen && <ShelfConfigDetail shelf={row} locList={locList} />}
                </ItemCard>
              );
            })}
          </CardList>
        ) : (
          <TableWrap>
            <Table<ShelfWithoutList>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
              expandable={{
                expandedRowRender: (record) => (
                  <ShelfConfigDetail shelf={record} locList={locList} />
                ),
              }}
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
        open={openEdit}
        title={`${t("edit_shelf_panel.edit_shelf")} — ${selectedRowKeys.length}`}
        onCancel={() => setOpenEdit(false)}
        onOk={submit}
        confirmLoading={submitMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Field>
            <FieldLabel>{t("edit_shelf_panel.category")}</FieldLabel>
            <Form.Item name="category" noStyle>
              <Select
                allowClear
                options={allCategory?.map((v) => ({
                  value: v.id,
                  label: v.name,
                }))}
              />
            </Form.Item>
          </Field>

          <Field style={{ marginTop: 12 }}>
            <FieldLabel>
              {t("edit_shelf_panel.load_mission")}{" "}
              <Tooltip title={t("shelf.cargo_mission.load_desc")}>
                <QuestionCircleOutlined />
              </Tooltip>
            </FieldLabel>
            <Form.Item name="load" noStyle>
              <Select allowClear options={misOptions} />
            </Form.Item>
          </Field>

          <Field style={{ marginTop: 12 }}>
            <FieldLabel>
              {t("edit_shelf_panel.offload_mission")}{" "}
              <Tooltip title={t("shelf.cargo_mission.offload_desc")}>
                <QuestionCircleOutlined />
              </Tooltip>
            </FieldLabel>
            <Form.Item name="offload" noStyle>
              <Select allowClear options={misOptions} />
            </Form.Item>
          </Field>

          <Field style={{ marginTop: 12 }}>
            <FieldLabel>{t("edit_shelf_panel.cargo_limit")}</FieldLabel>
            <Form.Item name="cargo_limit" noStyle>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Field>

          <Field style={{ marginTop: 12 }}>
            <FieldLabel>
              {t("shelf.cargo_mission.priority")}{" "}
              <Tooltip title={t("shelf.cargo_mission.priority_desc")}>
                <QuestionCircleOutlined />
              </Tooltip>
            </FieldLabel>
            <Form.Item
              name="placement_priority"
              rules={[
                {
                  required: true,
                  message: t("shelf.cargo_mission.priority_required"),
                },
                {
                  type: "number",
                  min: 0,
                  message: t("shelf.cargo_mission.priority_min"),
                },
              ]}
            >
              <InputNumber
                min={0}
                max={100}
                style={{ width: "100%" }}
                placeholder="10"
              />
            </Form.Item>
          </Field>

          <FieldLabel>
            {t("shelf.cargo_mission.relationships")}{" "}
            <Tooltip title={t("shelf.cargo_mission.relationships_desc")}>
              <QuestionCircleOutlined />
            </Tooltip>
          </FieldLabel>
          <Form.List name="relationships">
            {(fields, { add, remove }) => (
              <div style={{ marginTop: 8 }}>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{ display: "flex", gap: 8, marginBottom: 8 }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "relatedLocId"]}
                      rules={[
                        {
                          required: true,
                          message: t("shelf.cargo_mission.related_loc_required"),
                        },
                      ]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        options={relationOption}
                        placeholder={t("shelf.cargo_mission.select_location")}
                        showSearch={{
                          filterOption: (input, option) =>
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase()),
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "relationshipType"]}
                      rules={[
                        {
                          required: true,
                          message: t(
                            "shelf.cargo_mission.relationship_type_required",
                          ),
                        },
                      ]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        options={relationshipTypeOption}
                        placeholder={t(
                          "shelf.cargo_mission.select_relationship_type",
                        )}
                      />
                    </Form.Item>
                    <MinusCircleOutlined
                      onClick={() => remove(name)}
                      style={{ alignSelf: "center", color: "#c0341d" }}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  {t("shelf.cargo_mission.add_relationship")}
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default ShelfEditPanel;
