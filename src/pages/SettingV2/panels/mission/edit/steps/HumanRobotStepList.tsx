import { FC, useMemo, useState } from "react";
import { Skeleton, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import useTaskHumanRobot, { TaskType } from "@/api/useTaskHumanRobot";
import useIsNarrow from "../../../../ui/useIsNarrow";
import StatusTag from "../../../../ui/StatusTag";
import {
  CardFacts,
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
  OrderBadge,
  SortableTableRow,
  StackedCell,
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
 * 直接從 useTaskHumanRobot 的 yup schema 推出來,不要再手抄一份欄位定義,
 * 不然 schema 改了這裡不會壞、只會靜靜地對不上。
 */
type HumanStep = NonNullable<NonNullable<TaskType>[number]>;

type Props = {
  missionId: string;
  robotValue: string;
  onEditStep: (stepId: string) => void;
};

const HumanRobotStepList: FC<Props> = ({
  missionId,
  robotValue,
  onEditStep,
}) => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading } = useTaskHumanRobot(missionId);
  const steps = useMemo(
    () => (data ?? []).filter((v): v is HumanStep => !!v?.id),
    [data],
  );

  const { setDisabled, busy } = useStepMutations(
    "humanRobot",
    missionId,
    messageApi,
  );
  const { moveStep, onDragEnd, removeStep } = useStepList(
    "humanRobot",
    missionId,
    steps,
    messageApi,
  );

  const [jsonStep, setJsonStep] = useState<HumanStep | null>(null);
  const [importAfter, setImportAfter] = useState<number | null>(null);

  /** 動作代號(F/B/S/H/W)對使用者沒有意義,一律翻成中文再顯示 */
  const moveName = (code: string) => {
    switch (code) {
      case "F":
        return t("car_control_translate.F");
      case "B":
        return t("car_control_translate.B");
      case "S":
        return t("car_control_translate.S");
      case "H":
        return t("car_control_translate.H");
      case "W":
        return t("car_control_translate.W");
      default:
        return code;
    }
  };

  const actionBar = (step: HumanStep, withText: boolean) => (
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

  const typeCell = (step: HumanStep) =>
    step.operation.type?.length ? (
      <StackedCell>
        {step.operation.type.map((code, i) => (
          <ActionTag key={`${code}-${i}`}>{moveName(code)}</ActionTag>
        ))}
      </StackedCell>
    ) : (
      <Blank>—</Blank>
    );

  const controlCell = (step: HumanStep) =>
    step.operation.control?.length ? (
      <StackedCell>
        {step.operation.control.map((v, i) => (
          <Tag key={`${v}-${i}`}>{v}</Tag>
        ))}
      </StackedCell>
    ) : (
      <Blank>—</Blank>
    );

  const paramCell = (step: HumanStep) =>
    step.operation.param?.length ? (
      <StackedCell>
        {step.operation.param.map((p, i) => (
          <span key={`${p.joint ?? i}-${i}`}>{`${p.joint ?? "?"} = ${p.value ?? "—"}`}</span>
        ))}
      </StackedCell>
    ) : (
      <Blank>—</Blank>
    );

  const columns: TableColumnsType<HumanStep> = [
    { title: "", key: "sort", width: 44, render: () => <DragHandle /> },
    {
      title: t("mission.task_table_human_robot.sort"),
      dataIndex: "process_order",
      key: "process_order",
      width: 70,
      render: (order: number) => <OrderBadge>{order}</OrderBadge>,
    },
    {
      title: t("mission.task_table_human_robot.status"),
      dataIndex: "disable",
      key: "disable",
      width: 100,
      render: (disable: boolean) => (
        <StatusTag $on={!disable}>
          {disable
            ? t("mission.task_table_human_robot.inactive")
            : t("mission.task_table_human_robot.active")}
        </StatusTag>
      ),
    },
    {
      title: t("mission.task_table_human_robot.action"),
      key: "type",
      width: 110,
      render: (_, step) => typeCell(step),
    },
    {
      title: t("mission.task_table_human_robot.control"),
      key: "control",
      width: 140,
      render: (_, step) => controlCell(step),
    },
    {
      title: t("mission.task_table_human_robot.detail"),
      key: "param",
      width: 180,
      render: (_, step) => paramCell(step),
    },
    {
      title: t("mission.task_table.location"),
      dataIndex: ["operation", "locationId"],
      key: "locationId",
      width: 90,
      render: (id?: number) =>
        id || id === 0 ? <ActionTag>{id}</ActionTag> : <Blank>—</Blank>,
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
                    {typeCell(step)}
                    <StatusTag $on={!step.disable}>
                      {step.disable
                        ? t("mission.task_table_human_robot.inactive")
                        : t("mission.task_table_human_robot.active")}
                    </StatusTag>
                  </StepCardHead>

                  <IconBar>
                    <StepMoveButtons
                      index={i}
                      total={steps.length}
                      busy={busy}
                      onMove={moveStep}
                    />
                  </IconBar>

                  <CardFacts>
                    <dt>{t("mission.task_table_human_robot.control")}</dt>
                    <dd>{controlCell(step)}</dd>
                    <dt>{t("mission.task_table_human_robot.detail")}</dt>
                    <dd>{paramCell(step)}</dd>
                    <dt>{t("mission.task_table.location")}</dt>
                    <dd>
                      {step.operation.locationId ??
                        t("utils.none")}
                    </dd>
                  </CardFacts>

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
                  <Table<HumanStep>
                    size="small"
                    rowKey="id"
                    components={{ body: { row: SortableTableRow } }}
                    columns={columns}
                    dataSource={steps}
                    scroll={{ x: "max-content" }}
                    pagination={false}
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
        variant="humanRobot"
        robotValue={robotValue}
        messageApi={messageApi}
        onClose={() => setImportAfter(null)}
      />
    </>
  );
};

export default HumanRobotStepList;
