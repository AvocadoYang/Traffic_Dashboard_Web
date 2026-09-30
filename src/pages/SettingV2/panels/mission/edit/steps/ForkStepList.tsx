import { FC, useMemo, useState } from "react";
import { Checkbox, Skeleton, Table, Tooltip, message } from "antd";
import type { TableColumnsType } from "antd";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import useTaskFork from "@/api/useTaskFork";
import {
  Action_Type,
  Fork_Action,
} from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/types";
import CarControlTranslate from "@/pages/Setting/formComponent/forms/missionComponents/editMission/CarControlTranslate";
import useIsNarrow from "../../../../ui/useIsNarrow";
import StatusTag from "../../../../ui/StatusTag";
import {
  CardList,
  CountNote,
  EmptyState,
  Hint,
  TableWrap,
  Toolbar,
} from "../../../../ui/primitives";
import {
  ActionTag,
  Blank,
  DragHandle,
  IconBar,
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

/**
 * useTaskFork 宣告回傳 Fork_Action,但後端實際上還會帶 disable 與
 * extend_next_mission。v1 是在表格裡用 `as []` 整個蓋掉才看不出落差,
 * 這裡只在這一處收斂型別,底下就都是乾淨的 ForkStep。
 */
type ForkStep = Fork_Action & {
  id: string;
  process_order: number;
  disable: boolean;
  extend_next_mission: boolean;
};

type Props = {
  missionId: string;
  robotValue: string;
  onEditStep: (stepId: string) => void;
};

const ForkStepList: FC<Props> = ({ missionId, robotValue, onEditStep }) => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading } = useTaskFork(missionId);
  const steps = useMemo(() => (data ?? []) as ForkStep[], [data]);

  const { setDisabled, setExtendNext, busy } = useStepMutations(
    missionId,
    messageApi,
  );
  const { moveStep, onDragEnd, removeStep } = useStepList(
    missionId,
    steps,
    messageApi,
  );

  const [jsonStep, setJsonStep] = useState<ForkStep | null>(null);
  const [importAfter, setImportAfter] = useState<number | null>(null);

  const actionBar = (step: ForkStep, withText: boolean) => (
    <StepActionBar
      disabled={step.disable}
      withText={withText}
      busy={busy}
      onEdit={() => onEditStep(step.id)}
      onToggleDisable={() =>
        setDisabled.mutate({ id: step.id, disable: !step.disable })
      }
      onImport={() => setImportAfter(step.process_order)}
      onJson={() => setJsonStep(step)}
      onDelete={() => removeStep(step.id)}
    />
  );

  /** 這不是一個動作,是這個步驟的一個屬性,所以在表格裡自己占一欄 */
  const extendCheckbox = (step: ForkStep) => (
    <Tooltip title={t("mission.task_table.extend_next_mission_hint")}>
      <Checkbox
        checked={step.extend_next_mission}
        disabled={busy}
        onChange={(e) =>
          setExtendNext.mutate({
            id: step.id,
            extend_next_mission: e.target.checked,
          })
        }
      />
    </Tooltip>
  );

  const actionTag = (step: ForkStep) =>
    step.operation?.type ? (
      <ActionTag>
        <CarControlTranslate word={step.operation.type as Action_Type} />
      </ActionTag>
    ) : (
      <Blank>—</Blank>
    );

  const columns: TableColumnsType<ForkStep> = [
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
      width: 150,
      render: (_, step) => actionTag(step),
    },
    {
      title: t("mission.task_table.location"),
      dataIndex: ["operation", "locationId"],
      key: "locationId",
      width: 100,
      render: (id: number) =>
        id || id === 0 ? <ActionTag>{id}</ActionTag> : <Blank>—</Blank>,
    },
    {
      title: "EXTEND",
      key: "extend",
      width: 80,
      align: "center",
      render: (_, step) => extendCheckbox(step),
    },
    {
      title: t("utils.action"),
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, step) => actionBar(step, false),
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <>
      {contextHolder}

      {steps.length === 0 ? (
        <EmptyState>
          還沒有任何步驟。按上面的「新增步驟」開始,或用「引入任務」把別的任務整串複製過來。
        </EmptyState>
      ) : (
        <>
          <Toolbar>
            <CountNote>{`${steps.length} STEPS`}</CountNote>
            <Hint style={{ margin: 0 }}>
              {isNarrow ? "用上下箭頭調整順序" : "拖左側把手調整順序"}
            </Hint>
          </Toolbar>

          {isNarrow ? (
            <CardList>
              {steps.map((step, i) => (
                <StepCard key={step.id} $disabled={step.disable}>
                  <StepCardHead>
                    <OrderBadge>{step.process_order}</OrderBadge>
                    {actionTag(step)}
                    <StatusTag $on={!step.disable}>
                      {step.disable
                        ? t("mission.task_table.inactive")
                        : t("mission.task_table.active")}
                    </StatusTag>
                  </StepCardHead>

                  <IconBar>
                    <StepMoveButtons
                      index={i}
                      total={steps.length}
                      busy={busy}
                      onMove={moveStep}
                    />
                    <span style={{ flex: 1 }} />
                    {step.operation?.locationId ||
                    step.operation?.locationId === 0 ? (
                      <>
                        <CountNote>{t("mission.task_table.location")}</CountNote>
                        <ActionTag>{step.operation.locationId}</ActionTag>
                      </>
                    ) : null}
                  </IconBar>

                  <IconBar>
                    {extendCheckbox(step)}
                    <CountNote>EXTEND NEXT</CountNote>
                  </IconBar>

                  {actionBar(step, true)}
                </StepCard>
              ))}
            </CardList>
          ) : (
            <DndContext onDragEnd={onDragEnd}>
              <SortableContext
                items={steps.map((v) => v.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableWrap>
                  <Table<ForkStep>
                    size="small"
                    rowKey="id"
                    components={{ body: { row: SortableTableRow } }}
                    columns={columns}
                    dataSource={steps}
                    scroll={{ x: "max-content" }}
                    /* 步驟是一條有序流程,分頁會讓人沒辦法跨頁拖動 */
                    pagination={false}
                  />
                </TableWrap>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      <StepJsonModal
        value={
          jsonStep ? { operation: jsonStep.operation, io: jsonStep.io } : null
        }
        onClose={() => setJsonStep(null)}
      />

      <ImportStepModal
        target={
          importAfter === null
            ? null
            : { missionId, afterOrder: importAfter + 1 }
        }
        robotValue={robotValue}
        messageApi={messageApi}
        onClose={() => setImportAfter(null)}
      />
    </>
  );
};

export default ForkStepList;
