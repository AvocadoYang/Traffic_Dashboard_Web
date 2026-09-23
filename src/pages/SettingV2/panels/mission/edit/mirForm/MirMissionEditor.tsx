import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown, Skeleton, message } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, SaveOutlined } from "@ant-design/icons";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import client from "@/api/axiosClient";
import useTaskMir from "@/api/useTaskMir";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { Mir_Action } from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/type";
import { MirVariableProvider } from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/MirVariableContext";
import useIsNarrow from "../../../../ui/useIsNarrow";
import {
  CardList,
  CountNote,
  EmptyState,
  GhostButton,
  Hint,
  SolidButton,
  Toolbar,
} from "../../../../ui/primitives";
import { NestedEmpty, NestedList } from "../steps/stepPrimitives";
import MirActionCard, { EditorSlice } from "./MirActionCard";
import MirParamDrawer from "./MirParamDrawer";
import {
  ACTION_CATEGORIES,
  buildDefaultOperation,
  isContainerOperation,
} from "./mirActionSpec";

type Props = { missionId: string };

const MirMissionEditorContent: FC<Props> = ({ missionId }) => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading } = useTaskMir(missionId);

  const [slices, setSlices] = useState<EditorSlice[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 有沒有還沒存的本地修改 */
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  /**
   * 從後端資料重建本地編輯狀態。之後的新增 / 刪除 / 排序 / 巢狀 / 參數
   * 全部只改這份本地狀態,按「儲存」才一次送出去。
   *
   * useTaskMir 每 2 秒會輪詢一次,v1 沒有擋,只要後端資料一變動,使用者
   * 還沒存的編輯就會被整份蓋掉而且毫無提示。這裡只在沒有未存修改時才重建。
   */
  useEffect(() => {
    if (!data || dirtyRef.current) return;
    const idByScopeReference = new Map(
      data
        .filter((s) => s.scope_reference)
        .map((s) => [s.scope_reference as string, s.id]),
    );
    const next: EditorSlice[] = data.map((s) => ({
      clientId: s.id,
      dbId: s.id,
      disable: s.disable,
      operation: s.operation,
      parentClientId: s.scope_reference_content
        ? (idByScopeReference.get(s.scope_reference_content) ?? null)
        : null,
    }));
    setSlices(next);
    setExpanded(
      next.filter((s) => isContainerOperation(s.operation)).map((s) => s.clientId),
    );
  }, [data]);

  /** 每次改動本地狀態都走這裡,順便標記成未儲存 */
  const edit = useCallback(
    (updater: (prev: EditorSlice[]) => EditorSlice[]) => {
      setSlices(updater);
      setDirty(true);
    },
    [],
  );

  const topLevel = useMemo(
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

  const containers = useMemo(
    () => topLevel.filter((s) => isContainerOperation(s.operation)),
    [topLevel],
  );

  const editingSlice = useMemo(
    () => slices.find((s) => s.clientId === editingId) ?? null,
    [slices, editingId],
  );

  /* ------------------------------ 本地操作 ------------------------------ */

  const addAction = (type: string) =>
    edit((prev) => [
      ...prev,
      {
        clientId: nanoid(),
        dbId: null,
        disable: false,
        operation: buildDefaultOperation(type),
        parentClientId: null,
      },
    ]);

  const duplicate = (clientId: string) =>
    edit((prev) => {
      const index = prev.findIndex((s) => s.clientId === clientId);
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index + 1, 0, {
        ...prev[index],
        clientId: nanoid(),
        dbId: null,
        // 容器的 scope_reference 是後端配的,複製出來的那張要重新拿一個,
        // 不然兩個容器會共用同一個內容群組
        operation: { ...prev[index].operation, id: "", scope_reference: "" },
      });
      return next;
    });

  const remove = (clientId: string) => {
    if ((childrenByParent.get(clientId)?.length ?? 0) > 0) {
      void messageApi.warning(
        "這個區塊裡還有動作。請先把裡面的動作移回頂層,再刪除區塊。",
      );
      return;
    }
    edit((prev) => prev.filter((s) => s.clientId !== clientId));
    if (editingId === clientId) setEditingId(null);
  };

  const setParent = (clientId: string, parentClientId: string | null) => {
    edit((prev) =>
      prev.map((s) => (s.clientId === clientId ? { ...s, parentClientId } : s)),
    );
    if (parentClientId) {
      setExpanded((prev) =>
        prev.includes(parentClientId) ? prev : [...prev, parentClientId],
      );
    }
  };

  const updateOperation = (clientId: string, operation: Mir_Action) => {
    edit((prev) =>
      prev.map((s) => (s.clientId === clientId ? { ...s, operation } : s)),
    );
    setEditingId(null);
  };

  /** 只排頂層。巢狀子動作在自己的區塊裡,順序由後端依加入先後決定。 */
  const moveTopLevel = (from: number, to: number) => {
    // from < 0 代表拖的不是頂層那一層(例如用鍵盤拖到巢狀卡片),直接忽略
    if (from === to || from < 0 || to < 0 || to >= topLevel.length) return;
    const reordered = arrayMove(topLevel, from, to);
    edit((prev) => {
      // cursor 一定要宣告在 updater 裡面:React 在 StrictMode 下可能把
      // updater 呼叫兩次,放外面第二次會從上次用剩的值繼續累加,
      // reordered[cursor++] 就會讀到陣列外變成 undefined。
      let cursor = 0;
      return prev.map((s) => (s.parentClientId ? s : reordered[cursor++]));
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    moveTopLevel(
      topLevel.findIndex((s) => s.clientId === active.id),
      topLevel.findIndex((s) => s.clientId === over.id),
    );
  };

  const toggleExpand = (clientId: string) =>
    setExpanded((prev) =>
      prev.includes(clientId)
        ? prev.filter((v) => v !== clientId)
        : [...prev, clientId],
    );

  /* ------------------------------- 儲存 ------------------------------- */

  const saveMutation = useMutation({
    mutationFn: () =>
      client.post("api/setting/save-edit-mir-task-batch", {
        missionTitleId: missionId,
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
      void messageApi.success(t("utils.success"));
      // 先把 dirty 關掉,下面 refetch 回來的資料才會重建本地狀態
      setDirty(false);
      dirtyRef.current = false;
      await queryClient.refetchQueries({
        queryKey: ["all-relate-task-mir", missionId],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const categoryMenu = (
    category: (typeof ACTION_CATEGORIES)[number],
  ): MenuProps => ({
    items: category.actions.map((a) => ({ key: a, label: a })),
    onClick: ({ key }) => addAction(key),
  });

  const card = (slice: EditorSlice, index?: number) => (
    <MirActionCard
      key={slice.clientId}
      slice={slice}
      index={index}
      total={index === undefined ? undefined : topLevel.length}
      isNarrow={isNarrow}
      expanded={expanded.includes(slice.clientId)}
      childCount={childrenByParent.get(slice.clientId)?.length ?? 0}
      containers={containers}
      onToggleExpand={() => toggleExpand(slice.clientId)}
      onMove={index === undefined ? undefined : moveTopLevel}
      onSetParent={(parent) => setParent(slice.clientId, parent)}
      onEdit={() => setEditingId(slice.clientId)}
      onDuplicate={() => duplicate(slice.clientId)}
      onDelete={() => remove(slice.clientId)}
    />
  );

  const containerBody = (slice: EditorSlice) => {
    const children = childrenByParent.get(slice.clientId) ?? [];
    if (children.length === 0) {
      return (
        <NestedEmpty>
          目前是空的。在其他動作上把「所屬區塊」改成這一個,就會移進來。
        </NestedEmpty>
      );
    }
    return <NestedList>{children.map((child) => card(child))}</NestedList>;
  };

  if (isLoading) return <Skeleton active />;

  return (
    <>
      {contextHolder}

      <Toolbar>
        {ACTION_CATEGORIES.map((category) => (
          <Dropdown
            key={category.value}
            menu={categoryMenu(category)}
            trigger={["click"]}
          >
            <GhostButton type="button">
              {category.label}
              <DownOutlined />
            </GhostButton>
          </Dropdown>
        ))}
      </Toolbar>

      <Toolbar>
        <SolidButton
          type="button"
          disabled={saveMutation.isLoading}
          onClick={() => saveMutation.mutate()}
        >
          <SaveOutlined />
          {saveMutation.isLoading ? t("utils.loading") : t("utils.save")}
        </SolidButton>
        <CountNote>{`${topLevel.length} ACTIONS`}</CountNote>
        {dirty ? <CountNote>· 有尚未儲存的修改</CountNote> : null}
      </Toolbar>

      <Hint>
        {isNarrow
          ? "動作的增刪、排序、參數都只改本地暫存,按「儲存」才會一次寫進後端。用上下箭頭調整順序。"
          : "動作的增刪、排序、參數都只改本地暫存,按「儲存」才會一次寫進後端。拖左側把手調整順序。"}
      </Hint>

      {topLevel.length === 0 ? (
        <EmptyState>還沒有任何動作。從上面選一個分類開始新增。</EmptyState>
      ) : (
        <DndContext onDragEnd={onDragEnd}>
          <SortableContext
            items={topLevel.map((s) => s.clientId)}
            strategy={verticalListSortingStrategy}
          >
            <CardList>
              {topLevel.map((slice, index) => (
                <div key={slice.clientId}>
                  {card(slice, index)}
                  {isContainerOperation(slice.operation) &&
                  expanded.includes(slice.clientId)
                    ? containerBody(slice)
                    : null}
                </div>
              ))}
            </CardList>
          </SortableContext>
        </DndContext>
      )}

      <MirParamDrawer
        slice={editingSlice}
        onClose={() => setEditingId(null)}
        onSubmit={(next) => editingId && updateOperation(editingId, next)}
        onDelete={() => editingId && remove(editingId)}
      />
    </>
  );
};

/** 參數抽屜的「改用變數」狀態是跨欄位共用的,所以要包一層 Provider */
const MirMissionEditor: FC<Props> = ({ missionId }) => (
  <MirVariableProvider>
    <MirMissionEditorContent missionId={missionId} />
  </MirVariableProvider>
);

export default MirMissionEditor;
