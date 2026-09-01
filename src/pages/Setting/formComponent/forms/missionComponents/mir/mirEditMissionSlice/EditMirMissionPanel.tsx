import { FC, useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Popconfirm,
  Tooltip,
  message,
} from "antd";
import type { MenuProps } from "antd";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  MenuOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { useAtomValue } from "jotai";
import { currentMapIdAtom } from "@/utils/mapSelection";
import useTaskMir from "@/api/useTaskMir";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  Mir_Action,
  mirErrorHandlingList,
  mirIoModule,
  mirMoveActonList,
  mirSaftySystemList,
  mirSoundLight,
} from "./type";
import {
  MirBlockedDockingTimeoutInputInput,
  MirBlockedPathTimeoutInputInput,
  MirCollisionDetectionInput,
  MirDistanceThresholdInput,
  MirFootprintInput,
  MirFrontInput,
  MirLocationInput,
  MirMarkerTypeInput,
  MirMaximumAngularSpeedInputInput,
  MirMaximumLinearSpeedInputInput,
  MirModuleInput,
  MirOperationInput,
  MirOrientationInput,
  MirPortInput,
  MirRearInput,
  MirSideInput,
  MirSoundInput,
  MirSwitchMapInput,
  MirTimeoutInput,
  MirValueInput,
  MirVolumeInput,
  MirWaitInput,
  MirXInput,
  MirYInput,
} from "./FormInputs";
import { MirVariableProvider, useMirVariableFields } from "./MirVariableContext";

const REDUCE_PROTECTIVE_FIELDS_TYPE = "reduce_protective_fields";

type CategoryValue =
  | "move"
  | "sound/light"
  | "Error Handling"
  | "IO module"
  | "Safty system";

const CATEGORY_OPTIONS: {
  label: string;
  value: CategoryValue;
  actions: readonly string[];
}[] = [
  { label: "Move", value: "move", actions: mirMoveActonList },
  { label: "Sound/Light", value: "sound/light", actions: mirSoundLight },
  {
    label: "Error Handling",
    value: "Error Handling",
    actions: mirErrorHandlingList,
  },
  { label: "IO module", value: "IO module", actions: mirIoModule },
  {
    label: "Safety System",
    value: "Safty system",
    actions: mirSaftySystemList,
  },
];

// 跟 missionDefaultValue.ts 的 defaultMirAction() 同一套預設值，純本地產生，
// 不用打 /add-task —— 新卡片先留在畫面上，按 Save 才真的送到後端。
const buildDefaultOperation = (type: string): Mir_Action => ({
  id: "",
  currentMapId: "",
  type,
  scope_reference: "",
  location_id: "",
  entry_position: "",
  footprint: "",
  marker_type: "",
  blocked_path_timeout: 60,
  blocked_docking_timeout: 60,
  maximum_linear_speed: 0.25,
  maximum_angular_speed: 0.25,
  distance_threshold: 0.25,
  x: 0,
  y: 0,
  orientation: 0,
  collision_detection: true,
  wait: "00:00:00",
  sound: "",
  volume: 0,
  front: "unmuted",
  rear: "unmuted",
  sides: "unmuted",
  content: "",
  module: "",
  port: 0,
  value: "on",
  operation: "on",
  timeout: "00:00:00",
  variables: {},
});

type EditorSlice = {
  clientId: string;
  dbId: string | null;
  disable: boolean;
  operation: Mir_Action;
  parentClientId: string | null;
};

const isContainerOperation = (op?: Mir_Action | null) =>
  op?.type === REDUCE_PROTECTIVE_FIELDS_TYPE;

const summarizeAction = (
  op: Mir_Action,
): { verb: string; chip?: string } => {
  switch (op.type) {
    case "move":
      return { verb: "Move to", chip: op.location_id || "-" };
    case "docking":
      return { verb: "Dock to", chip: op.location_id || "-" };
    case "relative_move":
      return {
        verb: `Move X:${op.x ?? 0} Y:${op.y ?? 0} Orientation:${op.orientation ?? 0}`,
      };
    case "move_to_coordinate":
      return {
        verb: `Move to X:${op.x ?? 0} Y:${op.y ?? 0} Orientation:${op.orientation ?? 0}`,
      };
    case "set_footprint":
      return { verb: "Set footprint to", chip: op.footprint || "-" };
    case "switch_map":
      return { verb: "Switch map" };
    case "adjust_localization":
      return { verb: "Adjust localization" };
    case "wait":
      return { verb: `Wait ${op.wait || "00:00:00"}` };
    case "play_sound":
      return { verb: "Play sound", chip: op.sound || "-" };
    case "stop_sound":
      return { verb: "Stop sound" };
    case "show_light":
      return { verb: "Show light" };
    case REDUCE_PROTECTIVE_FIELDS_TYPE:
      return { verb: "Mute protective fields" };
    case "set_io":
      return { verb: `Set IO ${op.module ?? ""} port ${op.port ?? 0} to ${op.value ?? ""}` };
    case "wait_for_io":
      return { verb: `Wait for IO ${op.module ?? ""} port ${op.port ?? 0}` };
    default:
      return { verb: op.type || "Unknown action" };
  }
};

const renderActionFields = (
  actionType: string,
  isCurrentPosition: boolean,
) => {
  switch (actionType) {
    case "docking":
      return (
        <>
          <MirLocationInput disabled={isCurrentPosition} />
          {isCurrentPosition ? (
            <MirMarkerTypeInput />
          ) : (
            <MirBlockedPathTimeoutInputInput />
          )}
          <MirBlockedDockingTimeoutInputInput />
          <MirMaximumLinearSpeedInputInput />
        </>
      );
    case "move":
      return (
        <>
          <MirLocationInput />
          <MirBlockedPathTimeoutInputInput />
          <MirDistanceThresholdInput />
        </>
      );
    case "relative_move":
      return (
        <>
          <MirXInput />
          <MirYInput />
          <MirOrientationInput />
          <MirMaximumLinearSpeedInputInput />
          <MirMaximumAngularSpeedInputInput />
          <MirCollisionDetectionInput />
          <MirBlockedPathTimeoutInputInput />
        </>
      );
    case "set_footprint":
      return <MirFootprintInput />;
    case "switch_map":
      return <MirSwitchMapInput />;
    case "wait":
      return <MirWaitInput />;
    case REDUCE_PROTECTIVE_FIELDS_TYPE:
      return (
        <>
          <MirSoundInput />
          <MirVolumeInput />
          <MirFrontInput />
          <MirRearInput />
          <MirSideInput />
        </>
      );
    case "set_io":
      return (
        <>
          <MirModuleInput />
          <MirPortInput />
          <MirOperationInput />
          <MirTimeoutInput />
        </>
      );
    case "wait_for_io":
      return (
        <>
          <MirModuleInput />
          <MirPortInput />
          <MirValueInput />
          <MirTimeoutInput />
        </>
      );
    default:
      return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Styling                                                             */
/* ------------------------------------------------------------------ */

const PanelContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  width: 100%;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const CategoryButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
`;

const SaveBar = styled.div`
  margin-left: auto;
  display: flex;
  gap: 8px;
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CardRow = styled.div<{ $dragging?: boolean; $isContainer?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${({ $isContainer }) => ($isContainer ? "#fffbe6" : "#e6f4ff")};
  border: 1px solid ${({ $isContainer }) => ($isContainer ? "#ffe58f" : "#91caff")};
  border-radius: 4px;
  padding: 8px 12px;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};
`;

const CardLabel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #262626;
`;

const CardChip = styled.span`
  display: inline-block;
  padding: 1px 8px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  font-weight: 600;
  font-size: 11px;
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const DragHandle = styled(MenuOutlined)`
  cursor: move;
  color: #8c8c8c;
  touch-action: none;
`;

const ContainerBlock = styled.div`
  border: 1px dashed #ffd666;
  border-top: none;
  border-radius: 0 0 4px 4px;
  padding: 8px 8px 8px 34px;
  background: #fffdf5;
`;

const ContainerContent = styled.div<{ $isOver: boolean; $isEmpty: boolean }>`
  border: 1px dashed ${({ $isOver }) => ($isOver ? "#1890ff" : "#d9d9d9")};
  background: ${({ $isOver }) => ($isOver ? "#e6f7ff" : "#ffffff")};
  border-radius: 4px;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${({ $isEmpty }) => ($isEmpty ? "0" : "8px")};
`;

const EmptyHint = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  color: #8c8c8c;
  font-size: 12px;
`;

const DragPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  padding: 8px 14px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

/* ------------------------------------------------------------------ */
/*  Sortable single card                                               */
/* ------------------------------------------------------------------ */

const Card: FC<{
  slice: EditorSlice;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ slice, expanded, onToggleExpand, onEdit, onDuplicate, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slice.clientId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isContainer = isContainerOperation(slice.operation);
  const { verb, chip } = summarizeAction(slice.operation);

  return (
    <div ref={setNodeRef} style={style}>
      <CardRow $dragging={isDragging} $isContainer={isContainer}>
        <DragHandle {...attributes} {...listeners} />
        {isContainer ? (
          <Button
            type="text"
            size="small"
            icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            onClick={onToggleExpand}
          />
        ) : null}
        <CardLabel>
          {verb}
          {chip ? <CardChip>{chip}</CardChip> : null}
        </CardLabel>
        <CardActions>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={onDuplicate}
            />
          </Tooltip>
          <Popconfirm title="Delete this action?" onConfirm={onDelete}>
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </CardActions>
      </CardRow>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Container drop zone                                                */
/* ------------------------------------------------------------------ */

const ContainerDropZone: FC<{
  contentId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}> = ({ contentId, isEmpty, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `scope-${contentId}`,
    data: { type: "scope-container", contentId },
  });

  return (
    <ContainerContent ref={setNodeRef} $isOver={isOver} $isEmpty={isEmpty}>
      {isEmpty ? (
        <EmptyHint>Drag and drop actions here.</EmptyHint>
      ) : (
        children
      )}
    </ContainerContent>
  );
};

/* ------------------------------------------------------------------ */
/*  Parameter drawer                                                    */
/* ------------------------------------------------------------------ */

const ParameterDrawer: FC<{
  slice: EditorSlice | null;
  onClose: () => void;
  onUpdate: (operation: Mir_Action) => void;
  onDelete: () => void;
}> = ({ slice, onClose, onUpdate, onDelete }) => {
  const [form] = Form.useForm();
  const { fields: variableFields, setAllFields: setAllVariableFields } =
    useMirVariableFields();
  const isCurrentPosition = Form.useWatch("is_current_position", form);

  useEffect(() => {
    if (!slice) return;
    const op = slice.operation;

    const formattedWait =
      op.wait && dayjs(op.wait, "HH:mm:ss").isValid()
        ? dayjs(op.wait, "HH:mm:ss")
        : undefined;
    const formattedTimeout =
      op.timeout && dayjs(op.timeout, "HH:mm:ss").isValid()
        ? dayjs(op.timeout, "HH:mm:ss")
        : undefined;

    form.setFieldsValue({
      location_id: op.location_id,
      entry_position: op.entry_position,
      footprint: op.footprint,
      marker_type: op.marker_type || null,
      blocked_path_timeout: op.blocked_path_timeout ?? 60,
      blocked_docking_timeout: op.blocked_docking_timeout ?? 60,
      maximum_linear_speed: op.maximum_linear_speed ?? 0.25,
      maximum_angular_speed: op.maximum_angular_speed ?? 0.25,
      distance_threshold: op.distance_threshold ?? 0.25,
      x: op.x ?? 0,
      y: op.y ?? 0,
      orientation: op.orientation ?? 0,
      collision_detection: op.collision_detection ?? true,
      wait: formattedWait,
      sound: op.sound,
      volume: op.volume ?? 0,
      front: op.front ?? "unmuted",
      rear: op.rear ?? "unmuted",
      sides: op.sides ?? "unmuted",
      module: op.module ?? null,
      port: op.port ?? 0,
      value: op.value ?? "on",
      operation: op.operation ?? "on",
      timeout: formattedTimeout,
    });

    const savedVariables: Record<string, string> = op.variables ?? {};
    setAllVariableFields(
      Object.fromEntries(
        Object.entries(savedVariables).map(([fieldName, name]) => [
          fieldName,
          { enabled: true, name },
        ]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slice?.clientId]);

  const handleUpdate = () => {
    if (!slice) return;
    const raw = form.getFieldsValue();
    const nextOperation: Mir_Action = {
      ...slice.operation,
      location_id: raw.location_id ?? "",
      entry_position: raw.entry_position ?? "",
      footprint: raw.footprint ?? "",
      marker_type: raw.marker_type ?? null,
      blocked_path_timeout: raw.blocked_path_timeout ?? 60,
      blocked_docking_timeout: raw.blocked_docking_timeout ?? 60,
      maximum_linear_speed: raw.maximum_linear_speed ?? 0.25,
      maximum_angular_speed: raw.maximum_angular_speed ?? 0.25,
      distance_threshold: raw.distance_threshold ?? 0.25,
      x: raw.x ?? 0,
      y: raw.y ?? 0,
      orientation: raw.orientation ?? 0,
      collision_detection: raw.collision_detection ?? true,
      wait:
        raw.wait && dayjs(raw.wait).isValid()
          ? dayjs(raw.wait).format("HH:mm:ss")
          : "00:00:00",
      sound: raw.sound ?? "",
      volume: raw.volume ?? 0,
      front: raw.front ?? "unmuted",
      rear: raw.rear ?? "unmuted",
      sides: raw.sides ?? "unmuted",
      module: raw.module ?? null,
      port: raw.port ?? 0,
      value: raw.value ?? "on",
      operation: raw.operation ?? "on",
      timeout:
        raw.timeout && dayjs(raw.timeout).isValid()
          ? dayjs(raw.timeout).format("HH:mm:ss")
          : "00:00:00",
      variables: Object.fromEntries(
        Object.entries(variableFields)
          .filter(([, v]) => v.enabled && v.name)
          .map(([fieldName, v]) => [fieldName, v.name]),
      ),
    };
    onUpdate(nextOperation);
  };

  return (
    <Drawer
      title={slice ? summarizeAction(slice.operation).verb : ""}
      open={!!slice}
      onClose={onClose}
      width={420}
      destroyOnHidden
    >
      {slice ? (
        <>
          <Form form={form} layout="vertical">
            {renderActionFields(slice.operation.type, !!isCurrentPosition)}
          </Form>
          <div
            style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}
          >
            <Button type="primary" onClick={handleUpdate}>
              Update
            </Button>
            <Popconfirm title="Delete this action?" onConfirm={onDelete}>
              <Button danger>Delete</Button>
            </Popconfirm>
          </div>
        </>
      ) : null}
    </Drawer>
  );
};

/* ------------------------------------------------------------------ */
/*  Main panel                                                          */
/* ------------------------------------------------------------------ */

const EditMirMissionPanelContent: FC<{
  selectedMissionKey: string;
}> = ({ selectedMissionKey }) => {
  const { data: taskDataSource } = useTaskMir(selectedMissionKey);
  const currentMapId = useAtomValue(currentMapIdAtom);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const [slices, setSlices] = useState<EditorSlice[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  // 掛載/切換任務時,從既有資料重建本地編輯 state。之後的新增/刪除/排序/
  // 巢狀/參數編輯全部只改這份本地 state,不打任何 API,直到按 Save。
  useEffect(() => {
    if (!taskDataSource) return;
    const byScopeReference = new Map(
      taskDataSource
        .filter((s) => s.scope_reference)
        .map((s) => [s.scope_reference as string, s.id]),
    );
    const next: EditorSlice[] = taskDataSource.map((s) => ({
      clientId: s.id,
      dbId: s.id,
      disable: s.disable,
      operation: s.operation,
      parentClientId: s.scope_reference_content
        ? (byScopeReference.get(s.scope_reference_content) ?? null)
        : null,
    }));
    setSlices(next);
    setExpanded(
      new Set(
        next
          .filter((s) => isContainerOperation(s.operation))
          .map((s) => s.clientId),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMissionKey, taskDataSource]);

  const topLevelSlices = useMemo(
    () => slices.filter((s) => !s.parentClientId),
    [slices],
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, EditorSlice[]>();
    slices.forEach((s) => {
      if (!s.parentClientId) return;
      const list = map.get(s.parentClientId) ?? [];
      list.push(s);
      map.set(s.parentClientId, list);
    });
    return map;
  }, [slices]);

  const editingSlice = useMemo(
    () => slices.find((s) => s.clientId === editingClientId) ?? null,
    [slices, editingClientId],
  );
  const activeSlice = useMemo(
    () => slices.find((s) => s.clientId === activeClientId) ?? null,
    [slices, activeClientId],
  );

  const addAction = (actionType: string) => {
    setSlices((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        dbId: null,
        disable: false,
        operation: buildDefaultOperation(actionType),
        parentClientId: null,
      },
    ]);
  };

  const categoryMenu = (category: (typeof CATEGORY_OPTIONS)[number]): MenuProps => ({
    items: category.actions.map((a) => ({ key: a, label: a })),
    onClick: ({ key }) => addAction(key),
  });

  const duplicateSlice = (clientId: string) => {
    setSlices((prev) => {
      const target = prev.find((s) => s.clientId === clientId);
      if (!target) return prev;
      const clone: EditorSlice = {
        ...target,
        clientId: crypto.randomUUID(),
        dbId: null,
      };
      const index = prev.findIndex((s) => s.clientId === clientId);
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

  const deleteSlice = (clientId: string) => {
    const target = slices.find((s) => s.clientId === clientId);
    if (
      target &&
      isContainerOperation(target.operation) &&
      (childrenByParent.get(clientId)?.length ?? 0) > 0
    ) {
      messageApi.warning("這個區塊裡還有任務，請先把裡面的任務拖出來再刪除");
      return;
    }
    setSlices((prev) => prev.filter((s) => s.clientId !== clientId));
    if (editingClientId === clientId) setEditingClientId(null);
  };

  const updateSliceOperation = (clientId: string, operation: Mir_Action) => {
    setSlices((prev) =>
      prev.map((s) => (s.clientId === clientId ? { ...s, operation } : s)),
    );
    setEditingClientId(null);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveClientId(active.id as string);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveClientId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeSliceData = slices.find((s) => s.clientId === activeId);
    if (!activeSliceData) return;

    const overParentId = overId.startsWith("scope-")
      ? overId.replace("scope-", "")
      : (slices.find((s) => s.clientId === overId)?.parentClientId ?? null);

    const sourceParentId = activeSliceData.parentClientId ?? null;

    if (isContainerOperation(activeSliceData.operation) && overParentId) {
      messageApi.warning("Mute protective fields 本身不能被拖進另一個區塊");
      return;
    }

    if (sourceParentId === overParentId) {
      const siblings = slices.filter(
        (s) => (s.parentClientId ?? null) === sourceParentId,
      );
      const activeIndex = siblings.findIndex((s) => s.clientId === activeId);
      const overIndex = siblings.findIndex((s) => s.clientId === overId);
      if (activeIndex === -1 || overIndex === -1) return;
      const reordered = arrayMove(siblings, activeIndex, overIndex);

      // cursor 必須宣告在 updater callback 裡面,不能是外面的共用變數——
      // React（尤其 StrictMode dev 模式）可能把傳給 setState 的 updater
      // function 呼叫超過一次，若 cursor 是外部變數，第二次呼叫會從上次
      // 用剩的值繼續累加，導致 reordered[cursor++] 讀到陣列外面變成
      // undefined，混進 slices 裡讓後面的 .filter/.map 整個炸掉。
      setSlices((prev) => {
        let cursor = 0;
        return prev.map((s) =>
          (s.parentClientId ?? null) === sourceParentId
            ? reordered[cursor++]
            : s,
        );
      });
    } else {
      setSlices((prev) =>
        prev.map((s) =>
          s.clientId === activeId ? { ...s, parentClientId: overParentId } : s,
        ),
      );
      if (overParentId) {
        setExpanded((prev) => new Set(prev).add(overParentId));
      }
    }
  };

  const batchSaveMutation = useMutation({
    mutationFn: () =>
      client.post("api/setting/save-edit-mir-task-batch", {
        missionTitleId: selectedMissionKey,
        currentMapId: currentMapId || "",
        slices: slices.map((s) => ({
          clientId: s.clientId,
          dbId: s.dbId,
          disable: s.disable,
          operation: s.operation,
          parentClientId: s.parentClientId,
        })),
      }),
    onSuccess: async () => {
      void messageApi.success("儲存成功");
      await queryClient.refetchQueries({
        queryKey: ["all-relate-task-mir", selectedMissionKey],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  return (
    <PanelContainer>
      {contextHolder}
      <Toolbar>
        {CATEGORY_OPTIONS.map((category) => (
          <Dropdown key={category.value} menu={categoryMenu(category)} trigger={["click"]}>
            <CategoryButton>
              {category.label} <DownOutlined />
            </CategoryButton>
          </Dropdown>
        ))}
        <SaveBar>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={batchSaveMutation.isPending}
            onClick={() => batchSaveMutation.mutate()}
          >
            Save
          </Button>
        </SaveBar>
      </Toolbar>

      {topLevelSlices.length === 0 ? (
        <Empty description="還沒有任何動作，從上面選一個分類開始新增" />
      ) : (
        <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext
            items={topLevelSlices.map((s) => s.clientId)}
            strategy={verticalListSortingStrategy}
          >
            <CardList>
              {topLevelSlices.map((slice) => {
                const isContainer = isContainerOperation(slice.operation);
                const children = childrenByParent.get(slice.clientId) ?? [];
                return (
                  <div key={slice.clientId}>
                    <Card
                      slice={slice}
                      expanded={expanded.has(slice.clientId)}
                      onToggleExpand={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(slice.clientId)) {
                            next.delete(slice.clientId);
                          } else {
                            next.add(slice.clientId);
                          }
                          return next;
                        })
                      }
                      onEdit={() => setEditingClientId(slice.clientId)}
                      onDuplicate={() => duplicateSlice(slice.clientId)}
                      onDelete={() => deleteSlice(slice.clientId)}
                    />
                    {isContainer && expanded.has(slice.clientId) ? (
                      <ContainerBlock>
                        <SortableContext
                          items={children.map((c) => c.clientId)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ContainerDropZone
                            contentId={slice.clientId}
                            isEmpty={children.length === 0}
                          >
                            {children.map((child) => (
                              <Card
                                key={child.clientId}
                                slice={child}
                                expanded={false}
                                onToggleExpand={() => {}}
                                onEdit={() => setEditingClientId(child.clientId)}
                                onDuplicate={() => duplicateSlice(child.clientId)}
                                onDelete={() => deleteSlice(child.clientId)}
                              />
                            ))}
                          </ContainerDropZone>
                        </SortableContext>
                      </ContainerBlock>
                    ) : null}
                  </div>
                );
              })}
            </CardList>
          </SortableContext>

          <DragOverlay>
            {activeSlice ? (
              <DragPreview>
                <MenuOutlined />
                {summarizeAction(activeSlice.operation).verb}
              </DragPreview>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ParameterDrawer
        slice={editingSlice}
        onClose={() => setEditingClientId(null)}
        onUpdate={(operation) =>
          editingClientId && updateSliceOperation(editingClientId, operation)
        }
        onDelete={() => editingClientId && deleteSlice(editingClientId)}
      />
    </PanelContainer>
  );
};

const EditMirMissionPanel: FC<{
  selectedMissionKey: string;
}> = ({ selectedMissionKey }) => (
  <MirVariableProvider>
    <EditMirMissionPanelContent selectedMissionKey={selectedMissionKey} />
  </MirVariableProvider>
);

export default EditMirMissionPanel;
