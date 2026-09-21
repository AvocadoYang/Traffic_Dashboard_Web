import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Select, Skeleton, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import useTaskMir from "@/api/useTaskMir";
import { Mir_Action_Slice } from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/type";
import useIsNarrow from "../../../../ui/useIsNarrow";
import StatusTag from "../../../../ui/StatusTag";
import {
  CardList,
  CountNote,
  EmptyState,
  Hint,
  Tag,
  TableWrap,
  Toolbar,
} from "../../../../ui/primitives";
import {
  ActionTag,
  Blank,
  DragHandle,
  IconBar,
  NestedEmpty,
  NestedList,
  OrderBadge,
  SortableTableRow,
  StepCard,
  StepCardHead,
} from "./stepPrimitives";
import useStepMutations from "./useStepMutations";
import useStepList from "./useStepList";
import StepActionBar from "./StepActionBar";
import StepMoveButtons from "./StepMoveButtons";
import StepJsonModal from "./StepJsonModal";
import ImportStepModal from "./ImportStepModal";

type MirStep = Mir_Action_Slice;

/** 只有這個動作可以當容器,把其他動作包在它的作用範圍裡 */
const CONTAINER_TYPE = "reduce_protective_fields";
const isContainer = (s?: MirStep | null) =>
  s?.operation?.type === CONTAINER_TYPE;

/** 移回頂層。Select 不能用 null 當值,所以用一個不會撞名的字串代表 */
const TOP_LEVEL = "__top__";

type Props = {
  missionId: string;
  robotValue: string;
  onEditStep: (stepId: string) => void;
};

const MirStepList: FC<Props> = ({ missionId, robotValue, onEditStep }) => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading } = useTaskMir(missionId);
  const steps = useMemo(() => data ?? [], [data]);

  /** 只有頂層動作有全域 process_order,巢狀子動作在自己的區塊裡排 */
  const topLevel = useMemo(
    () => steps.filter((s) => !s.scope_reference_content),
    [steps],
  );

  /** key 是「容器自己的 scope_reference」,也就是子動作的 scope_reference_content */
  const childrenByScope = useMemo(() => {
    const map = new Map<string, MirStep[]>();
    steps.forEach((s) => {
      if (!s.scope_reference_content) return;
      const list = map.get(s.scope_reference_content) ?? [];
      list.push(s);
      map.set(s.scope_reference_content, list);
    });
    return map;
  }, [steps]);

  const containers = useMemo(
    () => topLevel.filter((s) => isContainer(s) && !!s.scope_reference),
    [topLevel],
  );

  const { setDisabled, setScope, busy } = useStepMutations(
    "mir",
    missionId,
    messageApi,
  );
  /** 排序只動頂層,寫回快取時要把巢狀子步驟原封不動接回去 */
  const rebuild = useCallback(
    (renumbered: MirStep[]) => [
      ...renumbered,
      ...steps.filter((s) => s.scope_reference_content),
    ],
    [steps],
  );

  const { moveStep, onDragEnd, removeStep } = useStepList(
    "mir",
    missionId,
    topLevel,
    messageApi,
    rebuild,
  );

  const [jsonStep, setJsonStep] = useState<MirStep | null>(null);
  const [importAfter, setImportAfter] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  /**
   * 容器第一次出現就自動展開,不然使用者看不到裡面還有東西;
   * 但如果他自己收起來了就不要再硬撐開。
   */
  useEffect(() => {
    setExpanded((prev) => {
      const missing = containers
        .map((s) => s.id)
        .filter((id) => !prev.includes(id));
      return missing.length ? [...prev, ...missing] : prev;
    });
  }, [containers]);

  /** 容器裡還有東西就不讓刪,不然那些子動作會變成孤兒 */
  const deleteStep = (step: MirStep) => {
    if (
      isContainer(step) &&
      step.scope_reference &&
      (childrenByScope.get(step.scope_reference)?.length ?? 0) > 0
    ) {
      void messageApi.warning(
        "這個區塊裡還有動作。請先把裡面的動作移回頂層,再刪除區塊。",
      );
      return;
    }
    removeStep(step.id);
  };

  /**
   * 指定這個動作屬於哪個區塊。
   * v1 是用拖曳把動作丟進容器,但那在手機上做不到,而且 v1 自己的註解也寫著
   * 區塊內的重新排序並沒有寫回後端,等於只做了一半。改成下拉選單之後
   * 兩種螢幕寬度行為一致,也少掉一整套 DragOverlay / useDroppable。
   */
  const scopeSelect = (step: MirStep) => (
    <Select<string>
      size="small"
      style={{ width: "100%", minWidth: 150 }}
      value={step.scope_reference_content ?? TOP_LEVEL}
      disabled={busy || containers.length === 0}
      onChange={(value) =>
        setScope.mutate({
          key: step.id,
          scope_reference_content: value === TOP_LEVEL ? null : value,
        })
      }
      options={[
        { value: TOP_LEVEL, label: "頂層" },
        ...containers.map((cont) => ({
          value: cont.scope_reference as string,
          label: `#${cont.process_order} ${CONTAINER_TYPE}`,
        })),
      ]}
    />
  );

  const actionBar = (step: MirStep, withText: boolean, canImport: boolean) => (
    <StepActionBar
      disabled={step.disable}
      withText={withText}
      busy={busy}
      onEdit={() => onEditStep(step.id)}
      onToggleDisable={() =>
        setDisabled.mutate({ id: step.id, disable: !step.disable })
      }
      onImport={canImport ? () => setImportAfter(step.process_order) : undefined}
      onJson={() => setJsonStep(step)}
      onDelete={() => deleteStep(step)}
    />
  );

  const actionTag = (step: MirStep) =>
    step.operation?.type ? (
      <ActionTag>{step.operation.type}</ActionTag>
    ) : (
      <Blank>—</Blank>
    );

  const locationTag = (step: MirStep) =>
    step.operation?.location_id ? (
      <ActionTag>{step.operation.location_id}</ActionTag>
    ) : (
      <Blank>—</Blank>
    );

  /** 區塊裡的子動作。不參與全域排序,所以沒有把手也沒有上下按鈕 */
  const childCard = (child: MirStep) => (
    <StepCard key={child.id} $disabled={child.disable}>
      <StepCardHead>
        {actionTag(child)}
        {locationTag(child)}
        <StatusTag $on={!child.disable}>
          {child.disable
            ? t("mission.task_table.inactive")
            : t("mission.task_table.active")}
        </StatusTag>
      </StepCardHead>
      {scopeSelect(child)}
      {actionBar(child, isNarrow, false)}
    </StepCard>
  );

  const childrenOf = (step: MirStep) => {
    const contentId = step.scope_reference;
    if (!contentId) {
      return (
        <NestedEmpty>
          這個區塊還沒存過,先儲存一次才能把動作放進來。
        </NestedEmpty>
      );
    }
    const list = childrenByScope.get(contentId) ?? [];
    if (list.length === 0) {
      return (
        <NestedEmpty>
          目前是空的。在其他動作的「所屬區塊」選這個區塊,就會移進來。
        </NestedEmpty>
      );
    }
    return <NestedList>{list.map(childCard)}</NestedList>;
  };

  const columns: TableColumnsType<MirStep> = [
    { title: "", key: "sort", width: 44, render: () => <DragHandle /> },
    {
      title: t("mission.task_table.sort"),
      dataIndex: "process_order",
      key: "process_order",
      width: 70,
      render: (order: number) => <OrderBadge>{order}</OrderBadge>,
    },
    {
      title: t("mission.task_table.status"),
      dataIndex: "disable",
      key: "disable",
      width: 100,
      render: (disable: boolean) => (
        <StatusTag $on={!disable}>
          {disable
            ? t("mission.task_table.inactive")
            : t("mission.task_table.active")}
        </StatusTag>
      ),
    },
    {
      title: t("mission.task_table.action"),
      key: "type",
      width: 190,
      render: (_, step) => actionTag(step),
    },
    {
      title: t("mission.task_table.location"),
      key: "location_id",
      width: 120,
      render: (_, step) => locationTag(step),
    },
    {
      title: "SCOPE",
      key: "scope",
      width: 180,
      render: (_, step) =>
        isContainer(step) ? (
          <Tag>{`${childrenByScope.get(step.scope_reference ?? "")?.length ?? 0} INSIDE`}</Tag>
        ) : (
          scopeSelect(step)
        ),
    },
    {
      title: t("utils.action"),
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, step) => actionBar(step, false, true),
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <>
      {contextHolder}

      {topLevel.length === 0 ? (
        <EmptyState>
          還沒有任何步驟。按上面的「新增步驟」開始,或用「引入任務」把別的任務整串複製過來。
        </EmptyState>
      ) : (
        <>
          <Toolbar>
            <CountNote>{`${topLevel.length} STEPS`}</CountNote>
            <Hint style={{ margin: 0 }}>
              {isNarrow
                ? "用上下箭頭調整順序;要放進 mute protective fields 區塊請用「所屬區塊」。"
                : "拖左側把手調整順序;要放進 mute protective fields 區塊請用 SCOPE 欄。"}
            </Hint>
          </Toolbar>

          {isNarrow ? (
            <CardList>
              {topLevel.map((step, i) => (
                <div key={step.id}>
                  <StepCard $disabled={step.disable}>
                    <StepCardHead>
                      <OrderBadge>{step.process_order}</OrderBadge>
                      {actionTag(step)}
                      {locationTag(step)}
                      <StatusTag $on={!step.disable}>
                        {step.disable
                          ? t("mission.task_table.inactive")
                          : t("mission.task_table.active")}
                      </StatusTag>
                    </StepCardHead>

                    <IconBar>
                      <StepMoveButtons
                        index={i}
                        total={topLevel.length}
                        busy={busy}
                        onMove={moveStep}
                      />
                    </IconBar>

                    {isContainer(step) ? null : scopeSelect(step)}
                    {actionBar(step, true, true)}
                  </StepCard>

                  {isContainer(step) ? childrenOf(step) : null}
                </div>
              ))}
            </CardList>
          ) : (
            <DndContext onDragEnd={onDragEnd}>
              <SortableContext
                items={topLevel.map((v) => v.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableWrap>
                  <Table<MirStep>
                    size="small"
                    rowKey="id"
                    components={{ body: { row: SortableTableRow } }}
                    columns={columns}
                    dataSource={topLevel}
                    scroll={{ x: "max-content" }}
                    pagination={false}
                    expandable={{
                      rowExpandable: (step) => isContainer(step),
                      expandedRowKeys: expanded,
                      onExpandedRowsChange: (keys) =>
                        setExpanded(keys as string[]),
                      expandedRowRender: (step) => childrenOf(step),
                    }}
                  />
                </TableWrap>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      <StepJsonModal
        value={jsonStep ? { operation: jsonStep.operation } : null}
        onClose={() => setJsonStep(null)}
      />

      <ImportStepModal
        target={
          importAfter === null
            ? null
            : { missionId, afterOrder: importAfter + 1 }
        }
        variant="mir"
        robotValue={robotValue}
        messageApi={messageApi}
        onClose={() => setImportAfter(null)}
      />
    </>
  );
};

export default MirStepList;
