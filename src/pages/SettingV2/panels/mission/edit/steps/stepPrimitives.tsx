import React, { FC, createContext, useContext, useMemo } from "react";
import { HolderOutlined } from "@ant-design/icons";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styled from "styled-components";
import { c, font, space, mqNarrow } from "../../../../ui/tokens";

/* ------------------------------------------------------------------ */
/*  拖曳排序                                                           */
/* ------------------------------------------------------------------ */

type RowDrag = {
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
};

/**
 * antd 的 Table 只讓我們換掉整個 <tr>,但拖曳把手要畫在某一格裡面。
 * v1 靠 cloneElement 去改那一格的 children,型別得一路 as 掉;
 * 這裡改成把 listeners 放進 context,由該格自己渲染 <DragHandle />。
 */
const RowDragContext = createContext<RowDrag>({});

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
}

export const SortableTableRow: FC<RowProps> = ({ children, ...props }) => {
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
    // 只吃垂直位移,橫向固定為 0,不然整列會跟著滑鼠往旁邊飄
    transform: CSS.Transform.toString(
      transform && { ...transform, scaleY: 1 },
    )?.replace(/translate3d\(([^,]+),/, "translate3d(0,"),
    transition,
    ...(isDragging
      ? { position: "relative", zIndex: 500, background: c.bgSubtle }
      : {}),
  };

  const ctx = useMemo(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners],
  );

  return (
    <RowDragContext.Provider value={ctx}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes}>
        {children}
      </tr>
    </RowDragContext.Provider>
  );
};

const HandleButton = styled.button`
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

/** 放在排序欄的 render 裡,會自動接上所在列的拖曳行為 */
export const DragHandle: FC = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowDragContext);
  return (
    <HandleButton type="button" ref={setActivatorNodeRef} {...listeners}>
      <HolderOutlined />
    </HandleButton>
  );
};

/* ------------------------------------------------------------------ */
/*  欄位呈現                                                           */
/* ------------------------------------------------------------------ */

/** 步驟序號。用等寬字體對齊,方便一眼掃過整串流程 */
export const OrderBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 1px 6px;
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 700;
  color: ${c.text};
  background: ${c.bgMuted};
  border: 1px solid ${c.border};
`;

/** 動作種類(move / load / docking…)。比一般 Tag 再重一階,因為它是這一列的主詞 */
export const ActionTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: ${font.xs};
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  color: ${c.text};
  background: ${c.bg};
  border: 1px solid ${c.borderStrong};
`;

/** 「這一格沒有值」的統一寫法,不要一個地方寫 "-" 一個地方留白 */
export const Blank = styled.span`
  color: ${c.textMuted};
`;

/** 多值欄位(人形車的控制項、關節參數)直向排列 */
export const StackedCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: ${font.xs};
  line-height: 1.5;
`;

/* ------------------------------------------------------------------ */
/*  動作按鈕                                                           */
/* ------------------------------------------------------------------ */

/** 表格裡的小圖示按鈕。窄螢幕的卡片上會帶文字,所以文字是選配的 */
export const IconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${c.bg};
  border: 1px solid ${({ $danger }) => ($danger ? c.dangerSoft : c.border)};
  color: ${({ $danger }) => ($danger ? c.danger : c.textSecondary)};

  &:hover:not(:disabled) {
    border-color: ${({ $danger }) => ($danger ? c.danger : c.borderStrong)};
    color: ${({ $danger }) => ($danger ? c.danger : c.text)};
    background: ${({ $danger }) => ($danger ? c.dangerSoft : c.bgSubtle)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;

export const IconBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.xs};
  flex-wrap: wrap;
`;

/* ------------------------------------------------------------------ */
/*  窄螢幕卡片                                                         */
/* ------------------------------------------------------------------ */

/**
 * 窄螢幕不掛拖曳(手指拖一個 28px 的把手太難),改用上下移動按鈕。
 * 兩邊最後呼叫的都是同一個 moveStep(from, to)。
 */
export const StepCard = styled.div<{ $disabled?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  padding: ${space.md};
  background: ${c.bg};
  border: 1px solid ${c.border};
  /* 停用的步驟整張壓暗,不用另一種顏色 */
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
`;

export const StepCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  flex-wrap: wrap;
`;

/** 卡片內的子步驟(MiR 的區塊內容)往內縮一階,表示層級 */
export const NestedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  margin-left: ${space.lg};
  padding-left: ${space.md};
  border-left: 2px solid ${c.border};

  ${mqNarrow} {
    margin-left: ${space.sm};
  }
`;

export const NestedEmpty = styled.div`
  padding: ${space.md};
  font-size: ${font.xs};
  color: ${c.textMuted};
  background: ${c.bgSubtle};
  border: 1px dashed ${c.border};
`;
