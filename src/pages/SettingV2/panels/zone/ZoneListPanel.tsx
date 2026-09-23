import { FC, useEffect, useMemo, useRef, useState } from "react";
import {
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
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
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import useAllGroupsResources from "@/api/useAllGroupsResources";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import GroupMapFilter from "../../ui/GroupMapFilter";
import ZoneFields from "../../ui/zoneFields";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
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
} from "../../ui/primitives";

type ZoneRow = {
  id: string;
  name: string;
  backgroundColor: string;
  category: string[];
  layer: string;
  lidar_front: boolean;
  lidar_back: boolean;
  tagSetting?: {
    speed_limit?: number | null;
    hight_limit?: number | null;
    forbidden_car?: string[];
    limitNum?: number | null;
    view_available?: number | null;
  };
  startPoint: { startX: number; startY: number };
  endPoint: { endX: number; endY: number };
  mapFileName: string;
  groupName: string;
};

const ZoneListPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [editForm] = Form.useForm();

  const { data: resources, refetch, isFetching } = useAllGroupsResources();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ZoneRow | null>(null);

  const activeGroupId = useMemo(
    () => resources?.groups.find((g) => g.isUsing)?.groupId ?? null,
    [resources],
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && activeGroupId) {
      setSelectedGroupId(activeGroupId);
      didInit.current = true;
    }
  }, [activeGroupId]);

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["map"] });
    queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
    queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
  };

  const editMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/edit-edit-zone", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      setEditing(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-edit-zone", { id, map_id: currentMapId }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
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
          count: m.zones.length,
        })),
      })) ?? [],
    [resources],
  );

  const rows: ZoneRow[] = useMemo(() => {
    if (!resources) return [];
    const groups = selectedGroupId
      ? resources.groups.filter((g) => g.groupId === selectedGroupId)
      : resources.groups;

    const all = groups.flatMap((g) => {
      const maps = selectedMapId
        ? g.maps.filter((m) => m.mapId === selectedMapId)
        : g.maps;
      return maps.flatMap((m) =>
        m.zones.map((zone) => ({
          ...zone,
          mapFileName: m.fileName,
          groupName: g.groupName,
        })),
      );
    }) as ZoneRow[];

    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter((z) => z.name.toLowerCase().includes(keyword));
  }, [resources, selectedGroupId, selectedMapId, search]);

  const openEdit = (row: ZoneRow) => {
    const forbiddenCar = row.tagSetting?.forbidden_car ?? [];
    // forbidden_car 存 ["*"] 代表當初勾的是「禁止所有車輛」,不是一台叫 "*" 的車
    const isAll = forbiddenCar.includes("*");

    editForm.setFieldsValue({
      name: row.name,
      category: row.category ?? [],
      layer: row.layer === "none" ? undefined : row.layer,
      lidar_front: row.lidar_front,
      lidar_back: row.lidar_back,
      startX: row.startPoint.startX,
      startY: row.startPoint.startY,
      endX: row.endPoint.endX,
      endY: row.endPoint.endY,
      speed_limit: row.tagSetting?.speed_limit ?? undefined,
      hight_limit: row.tagSetting?.hight_limit ?? undefined,
      limitNum: row.tagSetting?.limitNum ?? undefined,
      view_available: row.tagSetting?.view_available ?? undefined,
      all_forbidden: isAll,
      forbidden: isAll ? [] : forbiddenCar,
      color: row.backgroundColor,
    });
    setEditing(row);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await editForm.validateFields();
    } catch {
      return;
    }
    const v = editForm.getFieldsValue() as Record<string, unknown>;
    const allForbidden = v.all_forbidden as boolean;

    editMutation.mutate({
      ...v,
      id: editing.id,
      layer: v.layer ? v.layer : "none",
      lidar_back: v.layer ? v.lidar_back : false,
      lidar_front: v.layer ? v.lidar_front : false,
      forbidden: allForbidden ? ["*"] : ((v.forbidden as string[]) ?? []),
      map_id: currentMapId,
    });
  };

  const colorDot = (bg: string) => (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "1px solid #c8c8c8",
        background: bg,
        verticalAlign: "middle",
      }}
    />
  );

  const columns: TableColumnsType<ZoneRow> = [
    {
      title: t("zone_table_form.zone_name"),
      dataIndex: "name",
      key: "name",
      width: 130,
      fixed: "left",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("zone_table_form.start_point"),
      key: "startPoint",
      width: 120,
      render: (_, r) =>
        `${r.startPoint.startX.toFixed(1)}, ${r.startPoint.startY.toFixed(1)}`,
    },
    {
      title: t("zone_table_form.end_point"),
      key: "endPoint",
      width: 120,
      render: (_, r) =>
        `${r.endPoint.endX.toFixed(1)}, ${r.endPoint.endY.toFixed(1)}`,
    },
    {
      title: t("zone_table_form.layer"),
      dataIndex: "layer",
      key: "layer",
      width: 80,
      render: (v: string) => (v === "none" ? "—" : v),
    },
    {
      title: t("zone_table_form.lidar"),
      key: "lidar",
      width: 120,
      render: (_, r) =>
        r.layer === "none"
          ? "—"
          : `${t("edit_zone_panel.lidar_front")}: ${r.lidar_front ? t("utils.open") : t("utils.close")} / ${t("edit_zone_panel.lidar_back")}: ${r.lidar_back ? t("utils.open") : t("utils.close")}`,
    },
    {
      title: t("zone_table_form.zone_attr"),
      dataIndex: "category",
      key: "category",
      width: 160,
      render: (v: string[]) =>
        v?.length ? v.map((c) => <Tag key={c}>{c}</Tag>) : "—",
    },
    {
      title: t("zone_table_form.zone_color"),
      dataIndex: "backgroundColor",
      key: "backgroundColor",
      width: 80,
      render: colorDot,
    },
    {
      title: t("map_manager.map_group"),
      dataIndex: "mapFileName",
      key: "mapFileName",
      width: 130,
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

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <UnorderedListOutlined />
          {t("toolbar.zone.zones.show_zone_table")}
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
          placeholder={`${t("utils.search")} ${t("zone_table_form.zone_name")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO ZONES</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>
                    {colorDot(row.backgroundColor)} {row.name}
                  </span>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("zone_table_form.start_point")}</dt>
                  <dd>
                    {row.startPoint.startX.toFixed(1)},{" "}
                    {row.startPoint.startY.toFixed(1)}
                  </dd>
                  <dt>{t("zone_table_form.end_point")}</dt>
                  <dd>
                    {row.endPoint.endX.toFixed(1)},{" "}
                    {row.endPoint.endY.toFixed(1)}
                  </dd>
                  <dt>{t("zone_table_form.layer")}</dt>
                  <dd>{row.layer === "none" ? "—" : row.layer}</dd>
                  <dt>{t("zone_table_form.zone_attr")}</dt>
                  <dd>
                    {row.category?.length
                      ? row.category.map((c) => <Tag key={c}>{c}</Tag>)
                      : "—"}
                  </dd>
                  <dt>{t("map_manager.map_group")}</dt>
                  <dd>{row.mapFileName}</dd>
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
            <Table<ZoneRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editing}
        title={`${t("utils.edit")} — ${editing?.name ?? ""}`}
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
              <FieldLabel>START X</FieldLabel>
              <Form.Item name="startX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>START Y</FieldLabel>
              <Form.Item name="startY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>END X</FieldLabel>
              <Form.Item name="endX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>END Y</FieldLabel>
              <Form.Item name="endY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Field>
            <FieldLabel>{t("zone_table_form.zone_color")}</FieldLabel>
            <Form.Item name="color" noStyle>
              <ColorPicker />
            </Form.Item>
          </Field>

          <ZoneFields form={editForm} />
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default ZoneListPanel;
