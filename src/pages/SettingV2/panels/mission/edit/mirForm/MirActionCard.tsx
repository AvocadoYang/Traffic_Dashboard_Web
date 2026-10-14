import { FC } from "react";
import { Popconfirm, Tooltip } from "antd";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { Mir_Action } from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/type";
import { c, font, space } from "../../../../ui/tokens";
import { IconBar, IconButton } from "../steps/stepPrimitives";
import StepMoveButtons from "../steps/StepMoveButtons";
import {
  ParentSlot,
  isContainerOperation,
  summarizeAction,
} from "./mirActionSpec";

export type EditorSlice = {
  clientId: string;
  dbId: string | null;
  disable: boolean;
  operation: Mir_Action;
  parentClientId: string | null;
  parentSlot: ParentSlot | null;
  includeTitleId: string | null;
  includeTitleName: string;
  includeGroupId: string | null;
  includeVariables: Record<string, string | number | boolean>;
};

/** 「哪個容器的哪個區塊」合成一個字串,當分組與 drop zone 的 key */
export const slotKey = (parentClientId: string, slot: ParentSlot) =>
  `${parentClientId}:${slot}`;

const Row = styled.div<{ $dragging?: boolean; $container?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  flex-wrap: wrap;
  padding: ${space.sm} ${space.md};
  background: ${({ $container }) => ($container ? c.bgSubtle : c.bg)};
  /* 容器用粗左邊框標出來,不用另一種底色 */
  border: 1px solid ${c.border};
  border-left: ${({ $container }) =>
    $container ? `3px solid ${c.accent}` : `1px solid ${c.border}`};
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};

  &:hover {
    border-color: ${c.borderStrong};
  }
`;

const Label = styled.div`
  flex: 1 1 200px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${space.sm};
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.text};
  overflow-wrap: anywhere;
`;

const Chip = styled.span`
  display: inline-flex;
  padding: 1px 8px;
  border: 1px solid ${c.borderStrong};
  background: ${c.bg};
  font-size: ${font.xs};
  font-weight: 700;
`;

const Handle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid transparent;
  background: none;
  color: ${c.textMuted};
  cursor: grab;
  touch-action: none;

  &:hover {
    border-color: ${c.border};
    color: ${c.text};
  }
`;

type Props = {
  slice: EditorSlice;
  /** 在同一層(同一個區塊)兄弟之間的位置 */
  index: number;
  total: number;
  isNarrow: boolean;
  expanded: boolean;
  childCount: number;
  onToggleExpand: () => void;
  onMove: (from: number, to: number) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  unfilledVariables?: number;
};

const MirActionCard: FC<Props> = ({
  slice,
  index,
  total,
  isNarrow,
  expanded,
  childCount,
  onToggleExpand,
  onMove,
  onEdit,
  onDuplicate,
  onDelete,
  unfilledVariables = 0,
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slice.clientId });

  const isContainer = isContainerOperation(slice.operation);
  const { verb, chip } = slice.includeTitleId
    ? { verb: "Mission", chip: slice.includeTitleName || "-" }
    : summarizeAction(slice.operation);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
    >
      <Row $dragging={isDragging} $container={isContainer}>
        <Handle type="button" ref={setActivatorNodeRef} {...listeners}>
          <HolderOutlined />
        </Handle>
        {isNarrow ? (
          <IconBar>
            <StepMoveButtons
              index={index}
              total={total}
              busy={false}
              onMove={onMove}
            />
          </IconBar>
        ) : null}

        {isContainer ? (
          <IconButton type="button" onClick={onToggleExpand}>
            {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            {childCount}
          </IconButton>
        ) : null}

        <Label>
          {verb}
          {chip ? <Chip>{chip}</Chip> : null}
          {unfilledVariables > 0 ? (
            <Tooltip title={t("setting_v2.mir.unfilled_variables_hint")}>
              <Chip>
                {t("setting_v2.mir.unfilled_variables", {
                  count: unfilledVariables,
                })}
              </Chip>
            </Tooltip>
          ) : null}
        </Label>

        <IconBar>
          <Tooltip title={t("utils.edit")}>
            <IconButton type="button" onClick={onEdit}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("setting_v2.mir.duplicate_action")}>
            <IconButton type="button" onClick={onDuplicate}>
              <CopyOutlined />
            </IconButton>
          </Tooltip>
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={onDelete}
          >
            <IconButton type="button" $danger>
              <DeleteOutlined />
            </IconButton>
          </Popconfirm>
        </IconBar>
      </Row>
    </div>
  );
};

export default MirActionCard;
