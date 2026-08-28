import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import React, { FC, ReactNode, useEffect, useState } from "react";
import styled from "styled-components";
import { clamp } from "./gridConstants";

type ResizeDirection = "right" | "bottom" | "corner";

const Wrapper = styled.div<{ $width: number; $height: number }>`
  position: relative;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
`;

const OverlayIcons = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  z-index: 2;

  .anticon {
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, 0.7);
    }
  }
`;

const ResizeHandleRight = styled.div`
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: ew-resize;
  z-index: 2;
`;

const ResizeHandleBottom = styled.div`
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 100%;
  height: 8px;
  cursor: ns-resize;
  z-index: 2;
`;

const ResizeHandleCorner = styled.div`
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #1890ff;
  cursor: nwse-resize;
  z-index: 3;
`;

interface DispatchItemFrameProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  editMode: boolean;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  onEdit?: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
  children: (size: { width: number; height: number }) => ReactNode;
}

const DispatchItemFrame: FC<DispatchItemFrameProps> = ({
  id,
  x,
  y,
  width,
  height,
  editMode,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  onEdit,
  onDelete,
  onResizeEnd,
  children,
}) => {
  const [size, setSize] = useState({ width, height });
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, disabled: !editMode });

  useEffect(() => {
    setSize({ width, height });
  }, [width, height]);

  const startResize = (e: React.PointerEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const nextWidth =
        direction === "bottom"
          ? startWidth
          : clamp(startWidth + deltaX, minWidth, maxWidth);
      const nextHeight =
        direction === "right"
          ? startHeight
          : clamp(startHeight + deltaY, minHeight, maxHeight);

      setSize({ width: nextWidth, height: nextHeight });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setSize((current) => {
        onResizeEnd(current.width, current.height);
        return current;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 10 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <Wrapper $width={size.width} $height={size.height}>
        {children(size)}
        {editMode && (
          <>
            <OverlayIcons onPointerDown={(e) => e.stopPropagation()}>
              {onEdit && (
                <EditOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                />
              )}
              <DeleteOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              />
            </OverlayIcons>
            <ResizeHandleRight
              onPointerDown={(e) => startResize(e, "right")}
            />
            <ResizeHandleBottom
              onPointerDown={(e) => startResize(e, "bottom")}
            />
            <ResizeHandleCorner
              onPointerDown={(e) => startResize(e, "corner")}
            />
          </>
        )}
      </Wrapper>
    </div>
  );
};

export default DispatchItemFrame;
