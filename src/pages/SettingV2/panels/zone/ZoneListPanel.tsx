import { FC, useEffect, useMemo, useRef, useState } from "react";
import { Input, Popconfirm, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  StopOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import useAllGroupsResources from "@/api/useAllGroupsResources";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import GroupMapFilter from "../../ui/GroupMapFilter";
import { linkIdOf } from "../../ui/zoneLinks";
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
} from "../../ui/primitives";
import { c } from "../../ui/tokens";
import StatusTag from "../../ui/StatusTag";
import useToggleZoneEnabled from "@/api/useToggleZoneEnabled";
import ZoneEditModal, { ZoneRow } from "./ZoneEditModal";

const ZoneListPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const { data: resources, refetch, isFetching } = useAllGroupsResources();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ZoneRow | null>(null);
  const {
    setEnabled,
    pendingId,
    contextHolder: toggleHolder,
  } = useToggleZoneEnabled();

  const statusTag = (row: ZoneRow) => (
    <StatusTag $on={!row.disabled}>
      {t(row.disabled ? "zone_enable.disabled" : "zone_enable.enabled")}
    </StatusTag>
  );

  const toggleButton = (row: ZoneRow, withText: boolean) =>
    row.disabled ? (
      <GhostButton
        title={t("zone_enable.enable")}
        disabled={pendingId === row.id}
        onClick={() => setEnabled(row, true)}
      >
        <PoweroffOutlined />
        {withText && t("zone_enable.enable")}
      </GhostButton>
    ) : (
      <GhostButton
        title={t("zone_enable.disable")}
        disabled={pendingId === row.id}
        onClick={() => setEnabled(row, false)}
      >
        <StopOutlined />
        {withText && t("zone_enable.disable")}
      </GhostButton>
    );

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      // 後端收的是 zoneIds 陣列;送 { id } 的話它拿不到要刪哪一筆,每次都失敗
      client.post("api/setting/delete-edit-zone", { zoneIds: [id] }),
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
          mapId: m.mapId,
          mapFileName: m.fileName,
          groupId: g.groupId,
          groupName: g.groupName,
        })),
      );
    }) as ZoneRow[];

    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter((z) => z.name.toLowerCase().includes(keyword));
  }, [resources, selectedGroupId, selectedMapId, search]);

  const linkIdText = (row: ZoneRow, kind: "elevator" | "splice") =>
    linkIdOf(row, kind) ?? "—";

  const openEdit = (row: ZoneRow) => setEditing(row);

  const colorDot = (bg: string) => (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: `1px solid ${c.borderStrong}`,
        background: bg,
        verticalAlign: "middle",
      }}
    />
  );

  const columns: TableColumnsType<ZoneRow> = [
    {
      title: t("zone_enable.status"),
      key: "status",
      width: 90,
      fixed: "left",
      filters: [
        { text: t("zone_enable.enabled"), value: "enabled" },
        { text: t("zone_enable.disabled"), value: "disabled" },
      ],
      onFilter: (value, r) => (value === "disabled") === !!r.disabled,
      render: (_, r) => statusTag(r),
    },
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
      title: t("edit_zone_panel.elevator_id"),
      key: "elevator_id",
      width: 110,
      sorter: (a, b) =>
        linkIdText(a, "elevator").localeCompare(linkIdText(b, "elevator")),
      render: (_, r) => linkIdText(r, "elevator"),
    },
    {
      title: t("edit_zone_panel.splice_id"),
      key: "splice_id",
      width: 110,
      sorter: (a, b) =>
        linkIdText(a, "splice").localeCompare(linkIdText(b, "splice")),
      render: (_, r) => linkIdText(r, "splice"),
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
      width: 150,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          {toggleButton(row, false)}
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
      {toggleHolder}

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
          <EmptyState>{t("setting_v2.empty.zones")}</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>
                    {colorDot(row.backgroundColor)} {row.name}
                  </span>
                  {statusTag(row)}
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
                  {linkIdOf(row, "elevator") && (
                    <>
                      <dt>{t("edit_zone_panel.elevator_id")}</dt>
                      <dd>{linkIdText(row, "elevator")}</dd>
                    </>
                  )}
                  {linkIdOf(row, "splice") && (
                    <>
                      <dt>{t("edit_zone_panel.splice_id")}</dt>
                      <dd>{linkIdText(row, "splice")}</dd>
                    </>
                  )}
                  <dt>{t("map_manager.map_group")}</dt>
                  <dd>{row.mapFileName}</dd>
                </CardFacts>

                <Toolbar>
                  {toggleButton(row, true)}
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
                showTotal: (total) => t("utils.total", { total }),
              }}
            />
          </TableWrap>
        )}
      </Section>

      <ZoneEditModal zone={editing} onClose={() => setEditing(null)} />
    </PanelShell>
  );
};

export default ZoneListPanel;
