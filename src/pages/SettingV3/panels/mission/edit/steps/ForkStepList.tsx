import { FC, useMemo, useState } from "react";
import { LinkOutlined } from "@ant-design/icons";
import { Checkbox, Skeleton, Table, Tooltip, message } from "antd";
import type { TableColumnsType } from "antd";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import useTaskFork from "@/api/useTaskFork";
import { Action_Type, Fork_Action } from "@/types/forkAction";
import CarControlTranslate from "@/pages/SettingV3/forms/missionComponents/editMission/CarControlTranslate";
import useIsNarrow from "@/pages/SettingV3/ui/useIsNarrow";
import StatusTag from "@/pages/SettingV3/ui/StatusTag";
import {
  CardList,
  CountNote,
  EmptyState,
  Hint,
  TableWrap,
  Toolbar,
} from "@/pages/SettingV3/ui/primitives";
import {
  ActionTag,
  Blank,
  DragHandle,
  IconBar,
  IncludeBanner,
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
  /** 有值代表這一項是引用別的任務, 其他動作欄位都沒有 */
  include_title_id?: string | null;
  include_title_name?: string;
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

  const { setDisabled, setExtendNext, copy, busy } = useStepMutations(
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
      onCopy={() => copy.mutate(step.id)}
    />
  );

  const includeActionBar = (step: ForkStep, withText: boolean) => (
    <StepActionBar
      disabled={step.disable}
      withText={withText}
      busy={busy}
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

  const includeBanner = (step: ForkStep) => (
    <IncludeBanner>
      <LinkOutlined />
      {step.include_title_name || "—"}
      <ActionTag>{t("setting_v2.mission.include_badge")}</ActionTag>
    </IncludeBanner>
  );

  /** 引用的項目只能調順序和刪除, 其他欄位整列合併成一條橫幅 */
  const span = (step: ForkStep, n: number) => (step.include_title_id ? n : 1);

  const actionTag = (step: ForkStep) =>
    step.operation?.type ? (
      <ActionTag>
        <CarControlTranslate word={step.operation.type as Action_Type} />
      </ActionTag>
    ) : (
      <Blank>—</Blank>
    );

  /**
   * 地點由系統在派任務時才挑的步驟,存下來的 locationId 沒有意義,
   * 顯示它是怎麼挑的;其他的顯示點位編號。
   */
  const locationText = (step: ForkStep): string | number | null => {
    switch (step.operation?.is_define_id) {
      case "available_charge_station":
        return t("mission.task_table.location_charge_station");
      case "available_standby_point":
        return t("mission.task_table.location_standby_point");
      default: {
        const id = step.operation?.locationId;
        return id || id === 0 ? id : null;
      }
    }
  };

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
      onCell: (step) => ({ colSpan: span(step, 4) }),
      render: (disable: boolean, step) =>
        step.include_title_id ? (
          includeBanner(step)
        ) : (
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
      onCell: (step) => ({ colSpan: step.include_title_id ? 0 : 1 }),
      render: (_, step) => actionTag(step),
    },
    {
      title: t("mission.task_table.location"),
      key: "locationId",
      width: 170,
      onCell: (step) => ({ colSpan: step.include_title_id ? 0 : 1 }),
      render: (_, step) => {
        const text = locationText(step);
        return text === null ? <Blank>—</Blank> : <ActionTag>{text}</ActionTag>;
      },
    },
    {
      title: "EXTEND",
      key: "extend",
      width: 80,
      align: "center",
      onCell: (step) => ({ colSpan: step.include_title_id ? 0 : 1 }),
      render: (_, step) => extendCheckbox(step),
    },
    {
      title: t("utils.action"),
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, step) =>
        step.include_title_id
          ? includeActionBar(step, false)
          : actionBar(step, false),
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <>
      {contextHolder}

      {steps.length === 0 ? (
        <EmptyState>{t("setting_v2.mission.no_steps")}</EmptyState>
      ) : (
        <>
          <Toolbar>
            <CountNote>{`${steps.length} STEPS`}</CountNote>
            <Hint style={{ margin: 0 }}>
              {isNarrow
                ? t("setting_v2.mission.reorder_arrows")
                : t("setting_v2.mission.reorder_drag")}
            </Hint>
          </Toolbar>

          {isNarrow ? (
            <CardList>
              {steps.map((step, i) =>
                step.include_title_id ? (
                  <StepCard key={step.id} $disabled={step.disable}>
                    <StepCardHead>
                      <OrderBadge>{step.process_order}</OrderBadge>
                      {includeBanner(step)}
                    </StepCardHead>
                    <IconBar>
                      <StepMoveButtons
                        index={i}
                        total={steps.length}
                        busy={busy}
                        onMove={moveStep}
                      />
                    </IconBar>
                    {includeActionBar(step, true)}
                  </StepCard>
                ) : (
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
                      {locationText(step) !== null ? (
                        <>
                          <CountNote>
                            {t("mission.task_table.location")}
                          </CountNote>
                          <ActionTag>{locationText(step)}</ActionTag>
                        </>
                      ) : null}
                    </IconBar>

                    <IconBar>
                      {extendCheckbox(step)}
                      <CountNote>EXTEND NEXT</CountNote>
                    </IconBar>

                    {actionBar(step, true)}
                  </StepCard>
                ),
              )}
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
