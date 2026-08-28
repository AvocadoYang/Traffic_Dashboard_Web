import { DispatchWidget } from "@/api/useMissionDispatchBoard";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchItemFrame from "./DispatchItemFrame";
import {
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
} from "./gridConstants";

const Card = styled.div<{
  $width: number;
  $height: number;
  $color: string;
  $fontSize: number;
  $fontWeight: number;
  $editable: boolean;
}>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-word;
  user-select: none;
  color: ${({ $color }) => $color};
  font-size: ${({ $fontSize }) => $fontSize}px;
  font-weight: ${({ $fontWeight }) => $fontWeight};
  cursor: ${({ $editable }) => ($editable ? "grab" : "default")};
  border: 1px dashed ${({ $editable }) => ($editable ? "#d9d9d9" : "transparent")};
  background: ${({ $editable }) => ($editable ? "rgba(24, 144, 255, 0.03)" : "transparent")};
`;

const TextWidgetCard: FC<{
  widget: DispatchWidget;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ widget, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();

  return (
    <DispatchItemFrame
      id={widget.id}
      x={widget.x}
      y={widget.y}
      width={widget.width}
      height={widget.height}
      editMode={editMode}
      minWidth={MIN_WIDGET_WIDTH}
      maxWidth={MAX_WIDGET_WIDTH}
      minHeight={MIN_WIDGET_HEIGHT}
      maxHeight={MAX_WIDGET_HEIGHT}
      onEdit={onEdit}
      onDelete={onDelete}
      onResizeEnd={onResizeEnd}
    >
      {({ width, height }) => (
        <Card
          $width={width}
          $height={height}
          $color={widget.fontColor ?? "#262626"}
          $fontSize={widget.fontSize ?? 24}
          $fontWeight={widget.fontWeight ?? 600}
          $editable={editMode}
        >
          {widget.title || t("mission_dispatch_board.text_widget_placeholder")}
        </Card>
      )}
    </DispatchItemFrame>
  );
};

export default TextWidgetCard;
