import { FC, useEffect, useMemo, useRef, useState } from "react";
import {
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import useAllGroupsResources from "@/api/useAllGroupsResources";
import useAllAreaTypes from "@/api/useAllAreaTypes";
import client from "@/api/axiosClient";
import { locationOption } from "@/pages/Setting/utils/func";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { tooltipProp } from "@/utils/gloable";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import GroupMapFilter from "../../ui/GroupMapFilter";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  GhostButton,
  DangerButton,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  Field,
  FieldLabel,
  FieldGrid,
} from "../../ui/primitives";

type LocationRow = {
  id: string;
  locationId: string;
  x: string;
  y: string;
  offset_x?: number;
  offset_y?: number;
  rotate?: number;
  canRotate?: boolean;
  areaType: string;
  ip?: string | null;
  mapFileName: string;
  groupName: string;
  isActiveGroup: boolean;
};

const LocationListPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [editForm] = Form.useForm();

  const { data: resources, refetch, isFetching } = useAllGroupsResources();
  const { data: areaTypes } = useAllAreaTypes();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const setTooltip = useSetAtom(tooltipProp);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<LocationRow | null>(null);

  const activeGroupId = useMemo(
    () => resources?.groups.find((g) => g.isUsing)?.groupId ?? null,
    [resources],
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const didInitGroup = useRef(false);
  useEffect(() => {
    if (!didInitGroup.current && activeGroupId) {
      setSelectedGroupId(activeGroupId);
      didInitGroup.current = true;
    }
  }, [activeGroupId]);

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["map"] });
    queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
    queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
  };

  const editMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/edit-edit-loc", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      setEditing(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (data: { id: string; locationId: string }) =>
      client.post("api/setting/delete-edit-loc", data),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteManyMutation = useMutation({
    mutationFn: (id: string[]) =>
      client.post("api/setting/delete-multi-edit-loc", { id }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      setSelectedIds([]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const folders = useMemo(
    () =>
      resources?.groups.map((g) => ({
        groupId: g.groupId,
        groupName: g.groupName,
        isUsing: g.isUsing,
        maps: g.maps.map((m) => ({
          mapId: m.mapId,
          fileName: m.fileName,
          floor: m.floor,
          count: m.locations.length,
        })),
      })) ?? [],
    [resources],
  );

  const rows: LocationRow[] = useMemo(() => {
    if (!resources) return [];
    const groups = selectedGroupId
      ? resources.groups.filter((g) => g.groupId === selectedGroupId)
      : resources.groups;

    const all = groups.flatMap((g) => {
      const maps = selectedMapId
        ? g.maps.filter((m) => m.mapId === selectedMapId)
        : g.maps;
      return maps.flatMap((m) =>
        m.locations.map((loc) => ({
          ...loc,
          x: loc.x.toFixed(3),
          y: loc.y.toFixed(3),
          mapFileName: m.fileName,
          groupName: g.groupName,
          isActiveGroup: g.isUsing,
        })),
      );
    }) as LocationRow[];

    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (r) =>
        r.locationId.toLowerCase().includes(keyword) ||
        r.areaType.toLowerCase().includes(keyword),
    );
  }, [resources, selectedGroupId, selectedMapId, search]);

  const openEdit = (row: LocationRow) => {
    editForm.setFieldsValue({
      locationId: row.locationId,
      x: Number(row.x),
      y: Number(row.y),
      offset_x: row.offset_x ?? 0,
      offset_y: row.offset_y ?? 0,
      rotate: row.rotate ?? 0,
      canRotate: row.canRotate ?? false,
      areaType: row.areaType,
      ip: row.ip ?? "",
    });
    setEditing(row);
  };

  const submitEdit = () => {
    if (!editing) return;
    const values = editForm.getFieldsValue() as Record<string, unknown>;
    editMutation.mutate({
      ...values,
      id: editing.id,
      oldLocationId: editing.locationId,
      newLocationId: values.locationId,
      map_id: currentMapId,
    });
  };

  const hover = (row: LocationRow | null) =>
    setTooltip(
      row
        ? { locationId: row.locationId, x: Number(row.x), y: Number(row.y) }
        : null,
    );

  const columns: TableColumnsType<LocationRow> = [
    {
      title: t("utils.location"),
      dataIndex: "locationId",
      key: "locationId",
      width: 90,
      fixed: "left",
      sorter: (a, b) => Number(a.locationId) - Number(b.locationId),
    },
    { title: "X", dataIndex: "x", key: "x", width: 96 },
    { title: "Y", dataIndex: "y", key: "y", width: 96 },
    { title: "θ", dataIndex: "rotate", key: "rotate", width: 70 },
    {
      title: t("edit_location_panel.can_rotate"),
      dataIndex: "canRotate",
      key: "canRotate",
      width: 90,
      render: (v: boolean) => (v ? "YES" : "—"),
    },
    {
      title: t("utils.point_type"),
      dataIndex: "areaType",
      key: "areaType",
      width: 120,
      render: (v: string) => <Tag>{locationOption(v)}</Tag>,
    },
    { title: "IP", dataIndex: "ip", key: "ip", width: 130, render: (v) => v || "—" },
    {
      title: t("map_manager.map_group"),
      dataIndex: "mapFileName",
      key: "mapFileName",
      width: 140,
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => openEdit(row)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("edit_location_panel.table_notify.are_you_sure")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() =>
              deleteMutation.mutate({ id: row.id, locationId: row.locationId })
            }
          >
            <DangerButton>
              <DeleteOutlined />
            </DangerButton>
          </Popconfirm>
        </Toolbar>
      ),
    },
  ];

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <UnorderedListOutlined />
          {t("toolbar.location.show_locations_table")}
        </SectionTitle>

        <GroupMapFilter
          groups={folders}
          selectedGroupId={selectedGroupId}
          selectedMapId={selectedMapId}
          onSelectGroup={setSelectedGroupId}
          onSelectMap={setSelectedMapId}
        />

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ID / ${t("utils.point_type")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>

          <Popconfirm
            title={t("edit_location_panel.table_notify.are_you_sure")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            disabled={selectedIds.length === 0}
            onConfirm={() => deleteManyMutation.mutate(selectedIds)}
          >
            <DangerButton disabled={selectedIds.length === 0}>
              <DeleteOutlined />
              {t("utils.delete")} ({selectedIds.length})
            </DangerButton>
          </Popconfirm>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO LOCATIONS</EmptyState>
        ) : isNarrow ? (
          // 小螢幕:寬表格改成一列一張卡片,不用左右捲
          <CardList>
            {rows.map((row) => (
              <ItemCard
                key={row.id}
                $selected={selectedIds.includes(row.id)}
                onMouseEnter={() => hover(row)}
                onMouseLeave={() => hover(null)}
              >
                <CardTitleRow>
                  <span>
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, row.id]
                            : prev.filter((id) => id !== row.id),
                        )
                      }
                      style={{ marginRight: 8 }}
                    />
                    {row.locationId}
                  </span>
                  <Tag>{locationOption(row.areaType)}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>X / Y</dt>
                  <dd>
                    {row.x} / {row.y}
                  </dd>
                  <dt>θ</dt>
                  <dd>{row.rotate ?? 0}</dd>
                  <dt>{t("map_manager.map_group")}</dt>
                  <dd>{row.mapFileName}</dd>
                  {row.ip ? (
                    <>
                      <dt>IP</dt>
                      <dd>{row.ip}</dd>
                    </>
                  ) : null}
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => openEdit(row)}>
                    <EditOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                  <Popconfirm
                    title={t("edit_location_panel.table_notify.are_you_sure")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() =>
                      deleteMutation.mutate({
                        id: row.id,
                        locationId: row.locationId,
                      })
                    }
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
            <Table<LocationRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys as string[]),
              }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL ${total}`,
              }}
              onRow={(row) => ({
                onMouseEnter: () => hover(row),
                onMouseLeave: () => hover(null),
              })}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editing}
        title={`${t("utils.edit")} — ${editing?.locationId ?? ""}`}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        confirmLoading={editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("utils.location")} ID</FieldLabel>
              <Form.Item name="locationId" noStyle>
                <Input />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("utils.point_type")}</FieldLabel>
              <Form.Item name="areaType" noStyle>
                <Select
                  options={areaTypes?.map((a) => ({
                    value: a.value,
                    label: locationOption(a.value),
                  }))}
                />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>X</FieldLabel>
              <Form.Item name="x" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>Y</FieldLabel>
              <Form.Item name="y" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>offset X</FieldLabel>
              <Form.Item name="offset_x" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>offset Y</FieldLabel>
              <Form.Item name="offset_y" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>θ</FieldLabel>
              <Form.Item name="rotate" noStyle>
                <InputNumber min={-360} max={360} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("edit_location_panel.can_rotate")}</FieldLabel>
              <Form.Item name="canRotate" valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>IP</FieldLabel>
              <Form.Item name="ip" noStyle>
                <Input />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default LocationListPanel;
