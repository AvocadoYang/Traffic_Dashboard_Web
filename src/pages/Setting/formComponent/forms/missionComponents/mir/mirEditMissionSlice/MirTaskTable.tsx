import React, { FC, useEffect, useMemo, useState } from "react";
import {
  CodeOutlined,
  DeleteTwoTone,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ImportOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import ReactJsonView from "@uiw/react-json-view";
import {
  Button,
  Flex,
  Popconfirm,
  Table,
  Tooltip,
  message,
  Popover,
} from "antd";
import { ColumnsType } from "antd/es/table";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { useAtomValue } from "jotai";
import { currentMapIdAtom } from "@/utils/mapSelection";
import useTaskMir from "@/api/useTaskMir";
import { Err } from "@/utils/responseErr";
import { Mir_Action_Slice } from "./type";

/**
 * NOTE on types: this file assumes `Mir_Action_Slice` has two optional
 * fields (see the updated `Mir_Action` type):
 *   - scope_reference: only ever set on a reduce_protective_fields task —
 *     its own stable "content group" id.
 *   - scope_reference_content: only ever set on a task that's been dragged
 *     into a container's Content zone — the PARENT's scope_reference value
 *     (not the parent's row id). null/undefined = top-level task.
 * Please add both fields to `Mir_Action_Slice` in `./type` for full
 * type-safety; until then this file widens the type locally so it still
 * compiles.
 */
type ScopedTask = Mir_Action_Slice & {
  scope_reference?: string | null;
  scope_reference_content?: string | null;
};

const REDUCE_PROTECTIVE_FIELDS_TYPE = "reduce_protective_fields";
const isContainerTask = (t?: ScopedTask | null) =>
  t?.operation?.type === REDUCE_PROTECTIVE_FIELDS_TYPE;

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
  children: React.ReactNode;
}

// Industrial Styled Components
const IndustrialTableContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  width: 100%;

  .ant-table {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr {
    background: #ffffff;
    transition: all 0.2s ease;

    &:hover {
      background: #f0f5ff !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
    color: #595959;
  }

  .ant-table-expanded-row > td {
    background: #fafafa;
    padding: 0 !important;
  }

  .ant-pagination {
    font-family: "Roboto Mono", monospace;
  }
`;

const StatusIndicator = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  color: ${({ active }) => (active ? "#52c41a" : "#8c8c8c")};

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ active }) => (active ? "#52c41a" : "#8c8c8c")};
    box-shadow: ${({ active }) =>
      active ? "0 0 8px rgba(82, 196, 26, 0.6)" : "none"};
  }
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, auto);
  gap: 8px;
  width: 100%;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 28px;
  padding: 0 12px;

  &.ant-btn-link {
    color: #1890ff;

    &:hover {
      color: #40a9ff;
    }
  }

  &.ant-btn-link.ant-btn-dangerous {
    color: #ff4d4f;

    &:hover {
      color: #ff7875;
    }
  }
`;

const LocationBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
`;

const ActionTypeBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background: #fff7e6;
  border: 1px solid #ffa940;
  border-radius: 4px;
  color: #fa8c16;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

/* ------------------------------------------------------------------ */
/*  Scope panel (the "Content" drop zone inside a reduce_protective_    */
/*  fields row)                                                         */
/* ------------------------------------------------------------------ */

const ScopePanel = styled.div`
  padding: 16px 16px 16px 58px;
`;

const ScopePanelHeader = styled.div`
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #262626;
  margin-bottom: 8px;
  font-family: "Roboto Mono", monospace;
`;

const ScopeContent = styled.div<{ $isOver: boolean; $isEmpty: boolean }>`
  border: 1px dashed ${({ $isOver }) => ($isOver ? "#1890ff" : "#d9d9d9")};
  background: ${({ $isOver }) => ($isOver ? "#e6f7ff" : "#ffffff")};
  border-radius: 4px;
  min-height: 56px;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${({ $isEmpty }) => ($isEmpty ? "0" : "8px")};
`;

const ScopeEmptyHint = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  color: #fa8c16;
  font-size: 12px;
  font-family: "Roboto Mono", monospace;
`;

const ScopedRow = styled.div<{ $dragging?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
  padding: 8px 12px;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};
`;

const ScopedRowLabel = styled.span`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #389e0d;
  font-family: "Roboto Mono", monospace;
`;

const ScopedRowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DragHandleIcon = styled(MenuOutlined)`
  cursor: move;
  color: #8c8c8c;
  touch-action: none;
`;

const DragPreviewCard = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  padding: 8px 14px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #262626;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

/* ------------------------------------------------------------------ */
/*  Sortable row wrapper (top-level table rows)                        */
/* ------------------------------------------------------------------ */

const DataRow = ({ children, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props["data-row-key"] });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(
      transform && { ...transform, scaleY: 1 },
    )?.replace(/translate3d\(([^,]+),/, "translate3d(0,"),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 500 } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === "sort") {
          return React.cloneElement(child as React.ReactElement, {
            children: (
              <MenuOutlined
                ref={setActivatorNodeRef}
                style={{
                  touchAction: "none",
                  cursor: "move",
                  color: "#8c8c8c",
                }}
                {...listeners}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

/* ------------------------------------------------------------------ */
/*  Content drop zone for a reduce_protective_fields row                */
/* ------------------------------------------------------------------ */

const ScopeDropZone: FC<{
  contentId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}> = ({ contentId, isEmpty, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `scope-${contentId}`,
    data: { type: "scope-container", contentId },
  });

  return (
    <ScopeContent ref={setNodeRef} $isOver={isOver} $isEmpty={isEmpty}>
      {isEmpty ? (
        <ScopeEmptyHint>Drag and drop actions here.</ScopeEmptyHint>
      ) : (
        children
      )}
    </ScopeContent>
  );
};

/* ------------------------------------------------------------------ */
/*  A single task nested inside a scope's Content zone                 */
/* ------------------------------------------------------------------ */

const ScopedTaskRow: FC<{
  task: ScopedTask;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ task, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id as string,
    data: { type: "scoped-task", contentId: task.scope_reference_content },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ScopedRow ref={setNodeRef} style={style} $dragging={isDragging}>
      <DragHandleIcon {...attributes} {...listeners} />
      <ScopedRowLabel>
        {task.operation?.type ? (
          <ActionTypeBadge>{task.operation.type}</ActionTypeBadge>
        ) : (
          "-"
        )}
        {task.operation?.location_id ? (
          <LocationBadge>{task.operation.location_id}</LocationBadge>
        ) : null}
      </ScopedRowLabel>
      <ScopedRowActions>
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(task.id as string)}
          />
        </Tooltip>
        <Popconfirm
          title="Delete this action?"
          onConfirm={() => onDelete(task.id as string)}
        >
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
            />
          </Tooltip>
        </Popconfirm>
      </ScopedRowActions>
    </ScopedRow>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

const MirTaskTable: FC<{
  showModal: (key: string) => void;
  selectedMissionKey: string;
  selectedMissionCar: string;
}> = ({ showModal, selectedMissionKey, selectedMissionCar }) => {
  const { data: taskDataSourceRaw } = useTaskMir(selectedMissionKey);
  const taskDataSource = taskDataSourceRaw as ScopedTask[] | undefined;
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [importConfig, setImportConfig] = useState<{
    order: number;
    key: string;
  } | null>(null);
  const [showImportMission, setShowImportMission] = useState(false);
  const currentMapId = useAtomValue(currentMapIdAtom);
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(
    new Set(),
  );
  const [activeTask, setActiveTask] = useState<ScopedTask | null>(null);

  // auto-expand any reduce_protective_fields row the first time it shows
  // up, so its Content drop zone is immediately visible/usable — but
  // don't force it back open if the user deliberately collapsed it
  useEffect(() => {
    if (!taskDataSource) return;
    setExpandedContainers((prev) => {
      let changed = false;
      const next = new Set(prev);
      taskDataSource.forEach((t) => {
        if (isContainerTask(t) && t?.id && !next.has(t.id)) {
          next.add(t.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [taskDataSource]);

  const topLevelTasks = useMemo(
    () => (taskDataSource ?? []).filter((t) => !t?.scope_reference_content),
    [taskDataSource],
  );

  // keyed by the PARENT's scope_reference value (i.e. every child's
  // scope_reference_content), not by the parent's row id
  const childrenByScope = useMemo(() => {
    const map = new Map<string, ScopedTask[]>();
    (taskDataSource ?? []).forEach((t) => {
      if (t?.scope_reference_content) {
        const list = map.get(t.scope_reference_content) ?? [];
        list.push(t);
        map.set(t.scope_reference_content, list);
      }
    });
    return map;
  }, [taskDataSource]);

  const sortTaskMutation = useMutation({
    mutationFn: (data: {
      keyAndSort: { key: string; order: number }[];
      missionTitleId: string;
      currentMapId: string;
    }) => client.post("api/setting/update-task-order", data),
    onSuccess: () =>
      queryClient.refetchQueries({
        queryKey: ["all-relate-task-mir", selectedMissionKey],
      }),
    onError: (error: Err) => messageApi.error(error.response.data.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (payload: {
      key: string;
      keyAndOrder: { key: string; order: number }[];
    }) =>
      client.post("api/setting/delete-task", {
        missionTitleId: selectedMissionKey,
        targetKey: payload.key,
        newOrder: payload.keyAndOrder,
        currentMapId: currentMapId,
      }),
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: ["all-relate-task-mir"] }),
    onError: (error: Err) => messageApi.error(error.response.data.message),
  });

  const disableMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      disable: boolean;
      missionTitleId: string;
      currentMapId: string;
    }) => client.post("api/setting/disable-task", payload),
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({ queryKey: ["all-relate-task-mir"] });
    },
    onError: (error: Err) => messageApi.error(error.response.data.message),
  });

  // persists which reduce_protective_fields row (if any) a task has been
  // dragged into. Backend contract (see set-task-scope.route.ts):
  //   POST api/setting/set-task-scope
  //   { key, scope_reference_content, missionTitleId, currentMapId }
  //   scope_reference_content === null means "back to top level".
  const setScopeMutation = useMutation({
    mutationFn: (payload: {
      key: string;
      scope_reference_content: string | null;
      missionTitleId: string;
      currentMapId: string;
    }) => client.post("api/setting/set-task-scope", payload),
    onSuccess: () =>
      queryClient.refetchQueries({
        queryKey: ["all-relate-task-mir", selectedMissionKey],
      }),
    onError: (error: Err) => messageApi.error(error.response.data.message),
  });

  const deleteTask = (key: string) => {
    if (!taskDataSource) return;
    const target = taskDataSource.find((v) => v?.id === key);
    const hasChildren =
      isContainerTask(target) &&
      !!target?.scope_reference &&
      (childrenByScope.get(target.scope_reference)?.length ?? 0) > 0;
    if (hasChildren) {
      messageApi.warning("這個區塊裡還有任務，請先把裡面的任務拖出來再刪除");
      return;
    }
    const updatedDataSource = taskDataSource.filter((v) => v?.id !== key);
    // only top-level tasks carry a global process_order; nested tasks are
    // ordered within their own scope and don't affect this numbering
    const keyAndOrder = updatedDataSource
      .filter((v) => !v?.scope_reference_content)
      .map((v, i) => ({ key: v?.id as string, order: i }));
    deleteTaskMutation.mutate({ key, keyAndOrder });
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    const t = taskDataSource?.find((i) => i?.id === active.id);
    setActiveTask(t ?? null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!taskDataSource || !over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeTaskData = taskDataSource.find((i) => i?.id === activeId);
    if (!activeTaskData) return;

    // resolve the CONTENT id (a container's scope_reference value) of
    // whichever scope the drop landed in — either the empty-container
    // droppable itself, or a sibling task already inside that scope
    const overContentId = overId.startsWith("scope-")
      ? overId.replace("scope-", "")
      : (taskDataSource.find((i) => i?.id === overId)
          ?.scope_reference_content ?? null);

    const sourceContentId = activeTaskData.scope_reference_content ?? null;

    // a reduce_protective_fields row is a container itself and can't be
    // nested inside another one
    if (isContainerTask(activeTaskData) && overContentId) {
      messageApi.warning("Mute protective fields 本身不能被拖進另一個區塊");
      return;
    }

    if (sourceContentId === overContentId) {
      // -------- reordering within the same list (top-level or one scope) --------
      const siblings = taskDataSource.filter(
        (t) => (t?.scope_reference_content ?? null) === sourceContentId,
      );
      const activeIndex = siblings.findIndex((i) => i?.id === activeId);
      const overIndex = siblings.findIndex((i) => i?.id === overId);
      if (activeIndex === -1 || overIndex === -1) return;
      const reorderedSiblings = arrayMove(siblings, activeIndex, overIndex);

      let cursor = 0;
      const newData = taskDataSource.map((t) =>
        (t?.scope_reference_content ?? null) === sourceContentId
          ? reorderedSiblings[cursor++]
          : t,
      );

      if (sourceContentId === null) {
        const keyAndSort = newData
          .filter((t) => !t?.scope_reference_content)
          .map((v, i) => ({ key: v?.id as string, order: i }));
        sortTaskMutation.mutate({
          keyAndSort,
          missionTitleId: selectedMissionKey,
          currentMapId: currentMapId || "",
        });
      }
      // (reordering *within* a scope is only a local/visual concern for now —
      // wire up a dedicated "reorder within scope" call here if the backend
      // needs to persist that ordering too)

      queryClient.setQueryData(
        ["all-relate-task-mir", selectedMissionKey],
        newData,
      );
    } else {
      // -------- moved into / out of / between scopes --------
      const newData = taskDataSource.map((t) =>
        t?.id === activeId
          ? { ...t, scope_reference_content: overContentId }
          : t,
      );
      queryClient.setQueryData(
        ["all-relate-task-mir", selectedMissionKey],
        newData,
      );

      setScopeMutation.mutate({
        key: activeId,
        scope_reference_content: overContentId,
        missionTitleId: selectedMissionKey,
        currentMapId: currentMapId || "",
      });

      // leaving/joining the top-level list shifts everyone else's order too
      const keyAndSort = newData
        .filter((t) => !t?.scope_reference_content)
        .map((v, i) => ({ key: v?.id as string, order: i }));
      sortTaskMutation.mutate({
        keyAndSort,
        missionTitleId: selectedMissionKey,
        currentMapId: currentMapId || "",
      });

      if (overContentId) {
        // expandedRowKeys is keyed by row id, not by content id — look up
        // which container row owns this content id
        const containerRowId = taskDataSource.find(
          (t) => t?.scope_reference === overContentId,
        )?.id;
        if (containerRowId) {
          setExpandedContainers((prev) => new Set(prev).add(containerRowId));
        }
      }
    }
  };

  const disableTask = (id: string, disable: boolean) =>
    disableMutation.mutate({
      id,
      disable,
      missionTitleId: selectedMissionKey,
      currentMapId: currentMapId || "",
    });

  const showImportMissionModal = (order: number) => {
    setShowImportMission(true);
    setImportConfig({ key: selectedMissionKey, order: order + 1 });
  };

  const columns: ColumnsType<ScopedTask> = [
    {
      title: "",
      key: "sort",
      width: 50,
      render: () => <MenuOutlined style={{ cursor: "move" }} />,
    },
    {
      title: t("mission.task_table.sort"),
      dataIndex: "process_order",
      width: 80,
      render: (order: number) => (
        <span style={{ fontWeight: 600, color: "#262626" }}>#{order}</span>
      ),
    },
    {
      title: t("mission.task_table.status"),
      dataIndex: "disable",
      width: 120,
      render: (disable: boolean) => (
        <StatusIndicator active={!disable}>
          {disable
            ? t("mission.task_table.inactive")
            : t("mission.task_table.active")}
        </StatusIndicator>
      ),
    },
    {
      title: t("mission.task_table.action"),
      dataIndex: "operation",
      width: 150,
      render: (operation) =>
        operation.type ? (
          <ActionTypeBadge>{operation.type}</ActionTypeBadge>
        ) : (
          "-"
        ),
    },
    {
      title: t("mission.task_table.location"),
      dataIndex: ["operation", "id"],
      width: 120,
      render: (_, record) =>
        record.operation.location_id ? (
          <LocationBadge>{record.operation.location_id}</LocationBadge>
        ) : (
          <span style={{ color: "#8c8c8c" }}>-</span>
        ),
    },
    {
      title: "ACTIONS",
      key: "actions",
      width: 280,
      render: (_, record) => {
        const prefix1 = { operation: { ...record.operation } };

        return (
          <ActionGrid>
            {/* Row 1 */}
            <Popconfirm
              title={t("utils.delete_warn")}
              onConfirm={() => deleteTask(record.id)}
            >
              <IndustrialButton
                type="link"
                danger
                icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
                size="small"
              >
                {t("utils.delete")}
              </IndustrialButton>
            </Popconfirm>

            <IndustrialButton
              type="link"
              icon={<EditOutlined />}
              onClick={() => showModal(record.id)}
              size="small"
            >
              {t("utils.edit")}
            </IndustrialButton>

            <IndustrialButton
              type="link"
              icon={<ImportOutlined />}
              onClick={() => showImportMissionModal(record.process_order)}
              size="small"
            >
              IMPORT
            </IndustrialButton>

            {/* Row 2 */}
            <Popover
              title={
                <ReactJsonView
                  displayDataTypes={false}
                  value={prefix1}
                  collapsed={false}
                  enableClipboard={false}
                  style={{ fontSize: 12 }}
                />
              }
            >
              <IndustrialButton
                type="link"
                icon={<CodeOutlined />}
                size="small"
              >
                OPERATION
              </IndustrialButton>
            </Popover>

            <Tooltip
              title={
                record.disable
                  ? t("mission.task_table.in_use")
                  : t("mission.task_table.stop_this_process")
              }
            >
              <IndustrialButton
                type="link"
                icon={
                  record.disable ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                onClick={() => disableTask(record.id, !record.disable)}
                size="small"
              >
                {record.disable ? "ENABLE" : "DISABLE"}
              </IndustrialButton>
            </Tooltip>
          </ActionGrid>
        );
      },
    },
  ];

  if (!taskDataSource) return null;

  return (
    <IndustrialTableContainer>
      {contextHolder}
      <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext
          items={topLevelTasks.map((i) => i?.id || "")}
          strategy={verticalListSortingStrategy}
        >
          <Table
            components={{ body: { row: DataRow } }}
            rowKey="id"
            columns={columns}
            dataSource={topLevelTasks}
            bordered
            pagination={{ pageSize: 50 }}
            expandable={{
              rowExpandable: (record) => isContainerTask(record),
              expandedRowKeys: Array.from(expandedContainers),
              onExpandedRowsChange: (keys) =>
                setExpandedContainers(new Set(keys as string[])),
              expandedRowRender: (record) => {
                const contentId = (record as ScopedTask).scope_reference;
                if (!contentId) {
                  return (
                    <ScopePanel>
                      <ScopePanelHeader>Content</ScopePanelHeader>
                      <ScopeEmptyHint>
                        請先儲存一次這個任務，才能開始拖曳任務進來
                      </ScopeEmptyHint>
                    </ScopePanel>
                  );
                }
                const children = childrenByScope.get(contentId) ?? [];
                return (
                  <ScopePanel>
                    <ScopePanelHeader>Content</ScopePanelHeader>
                    <SortableContext
                      items={children.map((c) => c.id as string)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ScopeDropZone
                        contentId={contentId}
                        isEmpty={children.length === 0}
                      >
                        {children.map((c) => (
                          <ScopedTaskRow
                            key={c.id}
                            task={c}
                            onEdit={showModal}
                            onDelete={deleteTask}
                          />
                        ))}
                      </ScopeDropZone>
                    </SortableContext>
                  </ScopePanel>
                );
              },
            }}
          />
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <DragPreviewCard>
              <MenuOutlined />
              {activeTask.operation?.type ?? "task"}
              {activeTask.operation?.location_id ? (
                <LocationBadge>
                  {activeTask.operation.location_id}
                </LocationBadge>
              ) : null}
            </DragPreviewCard>
          ) : null}
        </DragOverlay>
      </DndContext>
    </IndustrialTableContainer>
  );
};

export default MirTaskTable;
