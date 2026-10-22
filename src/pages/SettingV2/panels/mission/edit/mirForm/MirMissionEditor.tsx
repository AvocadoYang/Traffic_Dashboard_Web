import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown, Skeleton, message } from "antd";
import type { MenuProps } from "antd";
import {
  DownOutlined,
  HolderOutlined,
  NodeExpandOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
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
import styled from "styled-components";
import { c, font, space } from "../../../../ui/tokens";
import { NestedEmpty, NestedList } from "../steps/stepPrimitives";
import { useIncludeMissionOptions } from "../steps/includeMission";
import useMirMissionTitleVariables from "@/api/useMirMissionTitleVariables";
import IncludeMissionDialog, {
  IncludeDialogTarget,
  IncludeVariables,
} from "./IncludeMissionDialog";
import MirActionCard, { EditorSlice, slotKey } from "./MirActionCard";
import MirParamDrawer from "./MirParamDrawer";
import {
  ACTION_CATEGORIES,
  INCLUDE_TYPE,
  ParentSlot,
  SLOT_LABEL,
  TRY_CATCH_TYPE,
  buildDefaultOperation,
  containerSlots,
  isContainerOperation,
  summarizeAction,
} from "./mirActionSpec";

type Props = {
  missionId: string;
  robotValue: string;
};

type IncludeFields = {
  include_title_id?: string | null;
  include_title_name?: string | null;
  include_variables?: IncludeVariables | null;
  include_group_id?: string | null;
};

const SlotHeader = styled.div`
  margin: ${space.sm} 0 ${space.xs};
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${c.text};
`;

/** 拖曳經過時把整個區塊框起來,讓人知道放開會進到哪裡 */
const ZoneFrame = styled.div<{ $over: boolean }>`
  outline: 2px dashed ${({ $over }) => ($over ? c.accent : "transparent")};
  outline-offset: 2px;
`;

const DragPreview = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.sm} ${space.md};
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.text};
  background: ${c.bg};
  border: 1px solid ${c.accent};
`;

const SLOT_ZONE = "mir-slot-zone";
type SlotZoneData = {
  type: typeof SLOT_ZONE;
  parentClientId: string;
  slot: ParentSlot;
};

/** 容器的一個區塊(content / try / catch)。空的時候也要能放東西進來 */
const SlotDropZone: FC<{
  parentClientId: string;
  slot: ParentSlot;
  children: React.ReactNode;
}> = ({ parentClientId, slot, children }) => {
  const data: SlotZoneData = { type: SLOT_ZONE, parentClientId, slot };
  const { setNodeRef, isOver } = useDroppable({
    id: `zone-${slotKey(parentClientId, slot)}`,
    data,
  });
  return (
    <ZoneFrame ref={setNodeRef} $over={isOver}>
      {children}
    </ZoneFrame>
  );
};

const MirMissionEditorContent: FC<Props> = ({ missionId, robotValue }) => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading } = useTaskMir(missionId);
  const includeOptions = useIncludeMissionOptions(missionId, robotValue);

  const [slices, setSlices] = useState<EditorSlice[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 新增或編輯 Missions 卡的對話框 */
  const [includeTarget, setIncludeTarget] = useState<IncludeDialogTarget>(null);
  /** 正在拖的那張,給 DragOverlay 用 */
  const [activeId, setActiveId] = useState<string | null>(null);
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
    // 子動作的 scope_reference_content 對應回 (父容器, 區塊):
    // reduce_protective_fields 的 content 區、try_catch 的 catch 區指向父容器
    // 的 scope_reference;try_catch 的 try 區指向父容器自己的 id。
    const parentByAnchor = new Map<
      string,
      { parentClientId: string; parentSlot: ParentSlot }
    >();
    data.forEach((s) => {
      if (s.operation?.type === TRY_CATCH_TYPE) {
        parentByAnchor.set(s.id, { parentClientId: s.id, parentSlot: "try" });
        if (s.scope_reference) {
          parentByAnchor.set(s.scope_reference, {
            parentClientId: s.id,
            parentSlot: "catch",
          });
        }
        return;
      }
      if (!s.scope_reference) return;
      parentByAnchor.set(s.scope_reference, {
        parentClientId: s.id,
        parentSlot: "content",
      });
    });
    // 同一個引用的複製在 process_order 上是連續的一段,第一筆是最外層。
    // 整段收成一張 Missions 卡,放在第一筆的位置、掛在第一筆的父層底下;
    // 複製出來的動作是唯讀的,不放進本地狀態,存檔時後端會重新產生。
    const disabledByGroup = new Map<string, boolean>();
    data.forEach((s) => {
      const groupId = (s as IncludeFields).include_group_id;
      if (!groupId) return;
      disabledByGroup.set(
        groupId,
        (disabledByGroup.get(groupId) ?? true) && s.disable,
      );
    });
    const seenGroups = new Set<string>();
    const next: EditorSlice[] = [];
    data.forEach((s) => {
      const include = s as IncludeFields;
      const groupId = include.include_group_id ?? null;
      if (groupId && seenGroups.has(groupId)) return;
      if (groupId) seenGroups.add(groupId);

      const parent = s.scope_reference_content
        ? parentByAnchor.get(s.scope_reference_content)
        : undefined;
      next.push(
        groupId
          ? {
              clientId: groupId,
              dbId: null,
              // 全部複製都停用,整張才算停用
              disable: disabledByGroup.get(groupId) ?? false,
              operation: buildDefaultOperation(INCLUDE_TYPE),
              parentClientId: parent?.parentClientId ?? null,
              parentSlot: parent?.parentSlot ?? null,
              includeTitleId: include.include_title_id ?? null,
              includeTitleName: include.include_title_name ?? "",
              includeGroupId: groupId,
              includeVariables: include.include_variables ?? {},
            }
          : {
              clientId: s.id,
              dbId: s.id,
              disable: s.disable,
              operation: s.operation,
              parentClientId: parent?.parentClientId ?? null,
              parentSlot: parent?.parentSlot ?? null,
              includeTitleId: null,
              includeTitleName: "",
              includeGroupId: null,
              includeVariables: {},
            },
      );
    });
    setSlices(next);
    setExpanded(
      next
        .filter((s) => isContainerOperation(s.operation))
        .map((s) => s.clientId),
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

  /** 畫面上的 Missions 卡引用的任務,查它們的變數算「還有幾個沒填」 */
  const includedIds = useMemo(
    () =>
      slices.map((s) => s.includeTitleId).filter((id): id is string => !!id),
    [slices],
  );
  const { variablesOf, fetchVariables } =
    useMirMissionTitleVariables(includedIds);

  const topLevel = useMemo(
    () => slices.filter((s) => !s.parentClientId),
    [slices],
  );

  /** key 是 slotKey(父容器, 區塊) */
  const childrenBySlot = useMemo(() => {
    const map = new Map<string, EditorSlice[]>();
    slices.forEach((s) => {
      if (!s.parentClientId || !s.parentSlot) return;
      const key = slotKey(s.parentClientId, s.parentSlot);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    });
    return map;
  }, [slices]);

  const childCountOf = (slice: EditorSlice) =>
    containerSlots(slice.operation).reduce(
      (sum, slot) =>
        sum + (childrenBySlot.get(slotKey(slice.clientId, slot))?.length ?? 0),
      0,
    );

  /** 同一個區塊裡的兄弟;parentClientId 為 null 就是頂層 */
  const siblingsOf = (
    parentClientId: string | null,
    slot: ParentSlot | null,
  ) =>
    parentClientId && slot
      ? (childrenBySlot.get(slotKey(parentClientId, slot)) ?? [])
      : topLevel;

  /**
   * candidateId 是不是 clientId 自己或它的子孫。容器可以再放進別的容器
   * (跟 v1 一樣),但不能拖進自己裡面,不然會變成迴圈。
   */
  const isSelfOrDescendant = (candidateId: string, clientId: string) => {
    const byId = new Map(slices.map((s) => [s.clientId, s]));
    // 最多往上走 slices.length 層,資料萬一有環也不會卡死
    let cur = byId.get(candidateId);
    for (let i = 0; cur && i <= slices.length; i++) {
      if (cur.clientId === clientId) return true;
      cur = cur.parentClientId ? byId.get(cur.parentClientId) : undefined;
    }
    return false;
  };

  const editingSlice = useMemo(
    () => slices.find((s) => s.clientId === editingId) ?? null,
    [slices, editingId],
  );
  const activeSlice = useMemo(
    () => slices.find((s) => s.clientId === activeId) ?? null,
    [slices, activeId],
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
        parentSlot: null,
        includeTitleId: null,
        includeTitleName: "",
        includeGroupId: null,
        includeVariables: {},
      },
    ]);

  /** 跟其他動作一樣加在最後,再拖進想要的位置或容器裡 */
  const addInclude = (
    includeTitleId: string,
    includeVariables: IncludeVariables,
  ) =>
    edit((prev) => [
      ...prev,
      {
        clientId: nanoid(),
        dbId: null,
        disable: false,
        operation: buildDefaultOperation(INCLUDE_TYPE),
        parentClientId: null,
        parentSlot: null,
        includeTitleId,
        includeTitleName: includeOptions.nameOf(includeTitleId),
        // 新的引用,後端會配一個 group id
        includeGroupId: null,
        includeVariables,
      },
    ]);

  const changeInclude = (
    clientId: string,
    includeTitleId: string,
    includeVariables: IncludeVariables,
  ) =>
    edit((prev) =>
      prev.map((s) =>
        s.clientId === clientId
          ? {
              ...s,
              includeTitleId,
              includeTitleName: includeOptions.nameOf(includeTitleId),
              includeVariables,
            }
          : s,
      ),
    );

  const pickInclude = (includeTitleId: string) => {
    fetchVariables(includeTitleId)
      .then((list) =>
        list.length
          ? setIncludeTarget({ clientId: null, includeTitleId, values: {} })
          : addInclude(includeTitleId, {}),
      )
      .catch(() =>
        setIncludeTarget({ clientId: null, includeTitleId, values: {} }),
      );
  };

  /** 引用那一張沒有一般的參數,編輯就是換任務、改變數的值 */
  const openEdit = (slice: EditorSlice) =>
    slice.includeTitleId
      ? setIncludeTarget({
          clientId: slice.clientId,
          includeTitleId: slice.includeTitleId,
          values: slice.includeVariables,
        })
      : setEditingId(slice.clientId);

  /** 這張還有幾個變數沒填,沒填的要等派任務時再填 */
  const unfilledCount = (slice: EditorSlice) =>
    slice.includeTitleId
      ? variablesOf(slice.includeTitleId).filter(
          (v) => slice.includeVariables[v.name] === undefined,
        ).length
      : 0;

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
        includeGroupId: null,
      });
      return next;
    });

  const remove = (clientId: string) => {
    if (slices.some((s) => s.parentClientId === clientId)) {
      void messageApi.warning(t("setting_v2.mir.container_not_empty"));
      return;
    }
    edit((prev) => prev.filter((s) => s.clientId !== clientId));
    if (editingId === clientId) setEditingId(null);
  };

  const updateOperation = (clientId: string, operation: Mir_Action) => {
    edit((prev) =>
      prev.map((s) => (s.clientId === clientId ? { ...s, operation } : s)),
    );
    setEditingId(null);
  };

  /** 在同一個區塊(或頂層)的兄弟之間排序 */
  const moveWithin = (
    parentClientId: string | null,
    slot: ParentSlot | null,
    from: number,
    to: number,
  ) => {
    const siblings = siblingsOf(parentClientId, slot);
    if (from === to || from < 0 || to < 0 || to >= siblings.length) return;
    const reordered = arrayMove(siblings, from, to);
    const inList = (s: EditorSlice) =>
      s.parentClientId === parentClientId && s.parentSlot === slot;
    edit((prev) => {
      // cursor 一定要宣告在 updater 裡面:React 在 StrictMode 下可能把
      // updater 呼叫兩次,放外面第二次會從上次用剩的值繼續累加,
      // reordered[cursor++] 就會讀到陣列外變成 undefined。
      let cursor = 0;
      return prev.map((s) => (inList(s) ? reordered[cursor++] : s));
    });
  };

  /**
   * 跟 v1 一樣:拖到同一層的卡片上就是排序;拖到別的區塊(容器的 drop zone
   * 或區塊裡的卡片)就是換父層,scope reference 的階層就是這樣改的。
   */
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const dragged = slices.find((s) => s.clientId === active.id);
    if (!dragged) return;

    const zone = over.data.current as SlotZoneData | undefined;
    const overSlice = slices.find((s) => s.clientId === over.id);
    const targetParent =
      zone?.type === SLOT_ZONE
        ? zone.parentClientId
        : (overSlice?.parentClientId ?? null);
    const targetSlot =
      zone?.type === SLOT_ZONE ? zone.slot : (overSlice?.parentSlot ?? null);

    if (
      targetParent === dragged.parentClientId &&
      targetSlot === dragged.parentSlot
    ) {
      const siblings = siblingsOf(targetParent, targetSlot);
      moveWithin(
        targetParent,
        targetSlot,
        siblings.findIndex((s) => s.clientId === dragged.clientId),
        siblings.findIndex((s) => s.clientId === over.id),
      );
      return;
    }

    if (targetParent && isSelfOrDescendant(targetParent, dragged.clientId)) {
      void messageApi.warning(t("setting_v2.mir.cannot_nest_into_self"));
      return;
    }

    edit((prev) =>
      prev.map((s) =>
        s.clientId === dragged.clientId
          ? { ...s, parentClientId: targetParent, parentSlot: targetSlot }
          : s,
      ),
    );
    if (targetParent) {
      setExpanded((prev) =>
        prev.includes(targetParent) ? prev : [...prev, targetParent],
      );
    }
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
          parentSlot: s.parentSlot,
          // 引用只送這一筆,不送複製出來的那些動作;後端照來源重新複製
          includeTitleId: s.includeTitleId,
          includeGroupId: s.includeGroupId,
          includeVariables: s.includeTitleId ? s.includeVariables : undefined,
        })),
      }),
    onSuccess: async ({ data: res }) => {
      void messageApi.success(t("utils.success"));
      // 這次存檔已經成功,這些是「引用這個任務的其他任務」重新同步到車上失敗,
      // 不擋這次存檔,只提醒
      ((res as { includeWarnings?: string[] })?.includeWarnings ?? []).forEach(
        (w) => void messageApi.warning(w, 8),
      );
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

  /** 跟 MiR 自己的編輯器一樣,既有任務是動作分類裡的一類 */
  const missionMenu: MenuProps = {
    items: includeOptions.groups.length
      ? includeOptions.groups.map((g) => ({
          type: "group" as const,
          key: `folder-${g.folder}`,
          label: g.folder,
          children: g.missions.map((m) => ({ key: m.id, label: m.name })),
        }))
      : [
          {
            key: "empty",
            label: t("setting_v2.mission.include_empty"),
            disabled: true,
          },
        ],
    onClick: ({ key }) => pickInclude(key),
    // 任務可能很多,不要讓選單長到超出畫面
    style: { maxHeight: 360, overflowY: "auto" },
  };

  /**
   * 卡片本身加上(容器展開時)底下的區塊。子動作也可能是容器,所以會遞迴,
   * 跟 v1 的 SliceNode 一樣。
   */
  const node = (slice: EditorSlice, index: number, siblingCount: number) => (
    <div key={slice.clientId}>
      <MirActionCard
        slice={slice}
        index={index}
        total={siblingCount}
        isNarrow={isNarrow}
        expanded={expanded.includes(slice.clientId)}
        childCount={childCountOf(slice)}
        onToggleExpand={() => toggleExpand(slice.clientId)}
        onMove={(from, to) =>
          moveWithin(slice.parentClientId, slice.parentSlot, from, to)
        }
        onEdit={() => openEdit(slice)}
        unfilledVariables={unfilledCount(slice)}
        onDuplicate={() => duplicate(slice.clientId)}
        onDelete={() => remove(slice.clientId)}
      />
      {isContainerOperation(slice.operation) &&
      expanded.includes(slice.clientId)
        ? containerBody(slice)
        : null}
    </div>
  );

  const containerBody = (slice: EditorSlice) => {
    const slots = containerSlots(slice.operation);
    return slots.map((slot) => {
      const children = childrenBySlot.get(slotKey(slice.clientId, slot)) ?? [];
      return (
        <div key={slot}>
          {slots.length > 1 ? (
            <SlotHeader>{SLOT_LABEL[slot]}</SlotHeader>
          ) : null}
          <SortableContext
            items={children.map((s) => s.clientId)}
            strategy={verticalListSortingStrategy}
          >
            <SlotDropZone parentClientId={slice.clientId} slot={slot}>
              {children.length === 0 ? (
                <NestedEmpty>{t("setting_v2.mir.nested_empty")}</NestedEmpty>
              ) : (
                <NestedList>
                  {children.map((child, i) => node(child, i, children.length))}
                </NestedList>
              )}
            </SlotDropZone>
          </SortableContext>
        </div>
      );
    });
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
        <Dropdown menu={missionMenu} trigger={["click"]}>
          <GhostButton type="button">
            <NodeExpandOutlined />
            Missions
            <DownOutlined />
          </GhostButton>
        </Dropdown>
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
        {dirty ? <CountNote>{t("setting_v2.mir.unsaved")}</CountNote> : null}
      </Toolbar>

      <Hint>
        {isNarrow
          ? t("setting_v2.mir.editor_hint_narrow")
          : t("setting_v2.mir.editor_hint_wide")}
      </Hint>

      {topLevel.length === 0 ? (
        <EmptyState>{t("setting_v2.mir.no_actions")}</EmptyState>
      ) : (
        <DndContext
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={topLevel.map((s) => s.clientId)}
            strategy={verticalListSortingStrategy}
          >
            <CardList>
              {topLevel.map((slice, index) =>
                node(slice, index, topLevel.length),
              )}
            </CardList>
          </SortableContext>

          {/* 跨區塊拖曳時原卡片會留在原位,用 overlay 跟著游標走 */}
          <DragOverlay>
            {activeSlice ? (
              <DragPreview>
                <HolderOutlined />
                {summarizeAction(activeSlice.operation).verb}
              </DragPreview>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <MirParamDrawer
        slice={editingSlice}
        onClose={() => setEditingId(null)}
        onSubmit={(next) => editingId && updateOperation(editingId, next)}
        onDelete={() => editingId && remove(editingId)}
      />

      <IncludeMissionDialog
        target={includeTarget}
        groups={includeOptions.groups}
        fetchVariables={fetchVariables}
        onCancel={() => setIncludeTarget(null)}
        onOk={(includeTitleId, values) => {
          if (includeTarget?.clientId) {
            changeInclude(includeTarget.clientId, includeTitleId, values);
          } else {
            addInclude(includeTitleId, values);
          }
          setIncludeTarget(null);
        }}
      />
    </>
  );
};

/** 參數抽屜的「改用變數」狀態是跨欄位共用的,所以要包一層 Provider */
const MirMissionEditor: FC<Props> = ({ missionId, robotValue }) => (
  <MirVariableProvider>
    <MirMissionEditorContent missionId={missionId} robotValue={robotValue} />
  </MirVariableProvider>
);

export default MirMissionEditor;
