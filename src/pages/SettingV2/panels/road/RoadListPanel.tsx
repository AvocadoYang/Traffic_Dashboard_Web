import { FC, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, Form, Input, Modal, Popconfirm, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import useAllGroupsResources from "@/api/useAllGroupsResources";
import client from "@/api/axiosClient";
import { hoverRoad } from "@/utils/gloable";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useIsNarrow from "../../ui/useIsNarrow";
import GroupMapFilter from "../../ui/GroupMapFilter";
import RoadCommonFields from "../../ui/roadFields";
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

type RoadRow = {
  id: string;
  roadId: string;
  roadType: "oneWayRoad" | "twoWayRoad";
  spot1Id: string;
  spot2Id: string;
  disabled: boolean;
  limit: boolean;
  priority: number;
  validYawList: number[] | string;
  mapFileName: string;
  groupName: string;
  isActiveGroup: boolean;
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "high",
  3: "medium",
  5: "low",
};

const RoadListPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [editForm] = Form.useForm();

  const { data: resources, refetch, isFetching } = useAllGroupsResources();
  const setHoverRoad = useSetAtom(hoverRoad);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<RoadRow | null>(null);

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
      client.post("api/setting/edit-edit-road", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      setEditing(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (roadId: string) =>
      client.post("api/setting/delete-edit-road", { roadId }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteManyMutation = useMutation({
    mutationFn: (roadId: string[]) =>
      client.post("api/setting/delete-multi-edit-road", { roadId }),
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
          count: m.roads.length,
        })),
      })) ?? [],
    [resources],
  );

  const rows: RoadRow[] = useMemo(() => {
    if (!resources) return [];
    const groups = selectedGroupId
      ? resources.groups.filter((g) => g.groupId === selectedGroupId)
      : resources.groups;

    const all = groups.flatMap((g) => {
      const maps = selectedMapId
        ? g.maps.filter((m) => m.mapId === selectedMapId)
        : g.maps;
      return maps.flatMap((m) =>
        m.roads.map((road) => ({
          ...road,
          mapFileName: m.fileName,
          groupName: g.groupName,
          isActiveGroup: g.isUsing,
        })),
      );
    }) as RoadRow[];

    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (r) =>
        String(r.spot1Id).toLowerCase().includes(keyword) ||
        String(r.spot2Id).toLowerCase().includes(keyword),
    );
  }, [resources, selectedGroupId, selectedMapId, search]);

  const yawText = (v: RoadRow["validYawList"]) =>
    Array.isArray(v) ? v.join(" / ") : String(v);

  const openEdit = (row: RoadRow) => {
    editForm.setFieldsValue({
      roadType: row.roadType,
      priority: row.priority,
      validYawList: Array.isArray(row.validYawList)
        ? row.validYawList.map(String)
        : [String(row.validYawList)],
      disabled: row.disabled,
      limit: row.limit,
    });
    setEditing(row);
  };

  const submitEdit = () => {
    if (!editing) return;
    const v = editForm.getFieldsValue() as Record<string, unknown>;
    editMutation.mutate({
      ...v,
      id: editing.id,
      spot1Id: Number(editing.spot1Id),
      spot2Id: Number(editing.spot2Id),
    });
  };

  const columns: TableColumnsType<RoadRow> = [
    {
      title: t("edit_road_panel.start_point"),
      dataIndex: "spot1Id",
      key: "spot1Id",
      width: 80,
      fixed: "left",
      sorter: (a, b) => Number(a.spot1Id) - Number(b.spot1Id),
    },
    {
      title: t("edit_road_panel.end_point"),
      dataIndex: "spot2Id",
      key: "spot2Id",
      width: 80,
    },
    {
      title: t("utils.point_type"),
      dataIndex: "roadType",
      key: "roadType",
      width: 100,
      render: (v: RoadRow["roadType"]) => (
        <Tag>
          {v === "oneWayRoad"
            ? t("edit_road_panel.single_road")
            : t("edit_road_panel.two_way_road")}
        </Tag>
      ),
    },
    {
      title: t("edit_road_panel.yaw"),
      dataIndex: "validYawList",
      key: "validYawList",
      width: 110,
      render: yawText,
    },
    {
      title: t("edit_road_panel.priority"),
      dataIndex: "priority",
      key: "priority",
      width: 80,
      render: (v: number) =>
        t(`edit_road_panel.${PRIORITY_LABEL[v] ?? "medium"}` as never),
    },
    {
      title: t("edit_road_panel.limit"),
      dataIndex: "limit",
      key: "limit",
      width: 80,
      render: (v: boolean) => (v ? t("utils.yes") : "—"),
    },
    {
      title: t("edit_road_panel.disabled"),
      dataIndex: "disabled",
      key: "disabled",
      width: 80,
      render: (v: boolean) => (v ? t("utils.yes") : "—"),
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
            onConfirm={() => deleteMutation.mutate(row.roadId)}
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
          {t("edit_road_panel.road_table")}
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
          placeholder={`${t("utils.search")} ${t("edit_road_panel.start_point")} / ${t("edit_road_panel.end_point")}`}
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
          <EmptyState>NO ROADS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard
                key={row.id}
                $selected={selectedIds.includes(row.roadId)}
                onMouseEnter={() => setHoverRoad(row.roadId)}
                onMouseLeave={() => setHoverRoad("")}
              >
                <CardTitleRow>
                  <span>
                    <Checkbox
                      checked={selectedIds.includes(row.roadId)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, row.roadId]
                            : prev.filter((id) => id !== row.roadId),
                        )
                      }
                      style={{ marginRight: 8 }}
                    />
                    {row.spot1Id} → {row.spot2Id}
                  </span>
                  <Tag>
                    {row.roadType === "oneWayRoad"
                      ? t("edit_road_panel.single_road")
                      : t("edit_road_panel.two_way_road")}
                  </Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("edit_road_panel.yaw")}</dt>
                  <dd>{yawText(row.validYawList)}</dd>
                  <dt>{t("edit_road_panel.priority")}</dt>
                  <dd>
                    {t(
                      `edit_road_panel.${PRIORITY_LABEL[row.priority] ?? "medium"}` as never,
                    )}
                  </dd>
                  <dt>{t("edit_road_panel.limit")}</dt>
                  <dd>{row.limit ? t("utils.yes") : "—"}</dd>
                  <dt>{t("edit_road_panel.disabled")}</dt>
                  <dd>{row.disabled ? t("utils.yes") : "—"}</dd>
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
                    onConfirm={() => deleteMutation.mutate(row.roadId)}
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
            <Table<RoadRow>
              size="small"
              rowKey="roadId"
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
                onMouseEnter: () => setHoverRoad(row.roadId),
                onMouseLeave: () => setHoverRoad(""),
              })}
            />
          </TableWrap>
        )}
      </Section>

      <Modal
        open={!!editing}
        title={`${t("utils.edit")} — ${editing?.spot1Id ?? ""} → ${editing?.spot2Id ?? ""}`}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        confirmLoading={editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical">
          <RoadCommonFields />
        </Form>
      </Modal>
    </PanelShell>
  );
};

export default RoadListPanel;
