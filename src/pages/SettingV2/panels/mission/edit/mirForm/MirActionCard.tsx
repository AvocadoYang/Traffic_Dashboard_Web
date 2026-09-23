import { FC } from "react";
import { Popconfirm, Select, Tooltip } from "antd";
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
import { isContainerOperation, summarizeAction } from "./mirActionSpec";

/** 移回頂層。Select 不能用 null 當值,所以用一個不會撞名的字串 */
export const TOP_LEVEL = "__top__";

export type EditorSlice = {
  clientId: string;
  dbId: string | null;
  disable: boolean;
  operation: Mir_Action;
  parentClientId: string | null;
};

const Row = styled.div<{ $dragging?: boolean; $container?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  flex-wrap: wrap;
  padding: ${space.sm} ${space.md};
  background: ${({ $container }) => ($container ? c.bgSubtle : c.bg)};
  /* 容器用粗左邊框標出來,不用另一種底色 */
  border: 1px solid ${c.border};
  border-left: ${({ $container }) => ($container ? `3px solid ${c.accent}` : `1px solid ${c.border}`)};
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
  /** 只有頂層卡片才會排序,巢狀子卡片沒有 */
  index?: number;
  total?: number;
  isNarrow: boolean;
  expanded: boolean;
  childCount: number;
  /** 可以選的容器。空陣列代表目前沒有任何容器 */
  containers: EditorSlice[];
  onToggleExpand: () => void;
  onMove?: (from: number, to: number) => void;
  onSetParent: (parentClientId: string | null) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const MirActionCard: FC<Props> = ({
  slice,
  index,
  total,
  isNarrow,
  expanded,
  childCount,
  containers,
  onToggleExpand,
  onMove,
  onSetParent,
  onEdit,
  onDuplicate,
  onDelete,
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
  const { verb, chip } = summarizeAction(slice.operation);
  const sortable = index !== undefined && total !== undefined && !!onMove;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
    >
      <Row $dragging={isDragging} $container={isContainer}>
        {sortable &&
          (isNarrow ? (
            <IconBar>
              <StepMoveButtons
                index={index}
                total={total}
                busy={false}
                onMove={onMove}
              />
            </IconBar>
          ) : (
            <Handle type="button" ref={setActivatorNodeRef} {...listeners}>
              <HolderOutlined />
            </Handle>
          ))}

        {isContainer ? (
          <IconButton type="button" onClick={onToggleExpand}>
            {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            {childCount}
          </IconButton>
        ) : null}

        <Label>
          {verb}
          {chip ? <Chip>{chip}</Chip> : null}
        </Label>

        {!isContainer && containers.length > 0 ? (
          <Select<string>
            size="small"
            style={{ minWidth: 160 }}
            value={slice.parentClientId ?? TOP_LEVEL}
            onChange={(v) => onSetParent(v === TOP_LEVEL ? null : v)}
            options={[
              { value: TOP_LEVEL, label: "頂層" },
              ...containers.map((cont) => ({
                value: cont.clientId,
                label: summarizeAction(cont.operation).verb,
              })),
            ]}
          />
        ) : null}

        <IconBar>
          <Tooltip title={t("utils.edit")}>
            <IconButton type="button" onClick={onEdit}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="複製這個動作">
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
