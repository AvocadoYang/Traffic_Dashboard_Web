import client from "@/api/axiosClient";
import {
  DISPATCH_PAGE_QUERY_KEY,
  DispatchButton,
  DispatchPage,
  DispatchWidget,
  DispatchWidgetType,
} from "@/api/useMissionDispatchBoard";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  BgColorsOutlined,
  ClearOutlined,
  FormatPainterOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ColorPicker, Dropdown, Modal, message } from "antd";
import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import AmrStatusWidgetCard from "./AmrStatusWidgetCard";
import DispatchButtonCard from "./DispatchButtonCard";
import MapViewWidgetCard from "./MapViewWidgetCard";
import MissionListWidgetCard from "./MissionListWidgetCard";
import QuickMissionWidgetCard from "./QuickMissionWidgetCard";
import TextWidgetCard from "./TextWidgetCard";
import { GRID_SIZE, snapToGrid } from "./gridConstants";

const CANVAS_MIN_HEIGHT = 400;
const MAX_FLOOD_FILL_CELLS = 50000;

// 從 (startCol, startRow) 往上下左右擴散,把所有跟起點同色(含都沒上色)的
// 相鄰格子一次換成 fillColor(null 代表擦除),直到碰到不同顏色的格子為止——
// 就是一般畫圖軟體的「油漆桶」填滿。用畫布目前實際渲染的像素尺寸當邊界,
// 避免在很大的空白畫布上無限擴散。
const floodFill = (
  cells: Record<string, string>,
  startCol: number,
  startRow: number,
  fillColor: string | null,
  widthPx: number,
  heightPx: number,
): Record<string, string> => {
  const maxCol = Math.ceil(widthPx / GRID_SIZE);
  const maxRow = Math.ceil(heightPx / GRID_SIZE);
  const key = (col: number, row: number) => `${col}_${row}`;
  const target = cells[key(startCol, startRow)] ?? null;
  if (target === fillColor) return cells;

  const next = { ...cells };
  const visited = new Set<string>();
  const queue: [number, number][] = [[startCol, startRow]];

  while (queue.length > 0 && visited.size < MAX_FLOOD_FILL_CELLS) {
    const [col, row] = queue.shift() as [number, number];
    if (col < 0 || row < 0 || col >= maxCol || row >= maxRow) continue;

    const k = key(col, row);
    if (visited.has(k)) continue;
    visited.add(k);

    if ((next[k] ?? null) !== target) continue;

    if (fillColor === null) {
      delete next[k];
    } else {
      next[k] = fillColor;
    }

    queue.push([col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]);
  }

  return next;
};

// 按鈕/元件用的是絕對像素座標,螢幕比放置當下窄/矮的時候內容會超出容器;
// 這層固定成跟外層 tabpane 一樣高(見 MissionDispatchBoard.tsx 的 TabsArea),
// 兩個方向都能捲動,捲軸會貼在這個可視範圍的邊緣,而不是被畫布本身的高度/
// 寬度撐到很遠的地方,要捲到底才看得到、甚至完全捲不到。
const CanvasScrollArea = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
`;

const Canvas = styled.div<{
  $showGrid: boolean;
  $height: number;
  $width: number;
  $paintMode: boolean;
}>`
  position: relative;
  width: max(100%, ${({ $width }) => $width}px);
  height: ${({ $height }) => $height}px;
  cursor: ${({ $paintMode }) => ($paintMode ? "crosshair" : "default")};
  background-image: ${({ $showGrid }) =>
    $showGrid
      ? "linear-gradient(to right, #e0e0e0 1px, transparent 1px), linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)"
      : "none"};
  background-size: ${GRID_SIZE}px ${GRID_SIZE}px;
`;

const AddButton = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 2px dashed #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  cursor: pointer;
  background: #ffffff;
  z-index: 2;

  &:hover {
    border-color: #1890ff;
    color: #1890ff;
  }
`;

const EmptyHint = styled.div`
  padding: 32px;
  color: #8c8c8c;
  text-align: center;
`;

const PaintedCell = styled.div<{ $color: string }>`
  position: absolute;
  width: ${GRID_SIZE}px;
  height: ${GRID_SIZE}px;
  background: ${({ $color }) => $color};
  pointer-events: none;
`;

const PaintToolbar = styled.div`
  position: absolute;
  top: 12px;
  left: 80px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
`;

const ToolButton = styled.div<{ $active: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#ffffff" : "#595959")};
  background: ${({ $active }) => ($active ? "#1890ff" : "transparent")};

  &:hover {
    background: ${({ $active }) => ($active ? "#1890ff" : "#f0f0f0")};
  }
`;

const DispatchCanvas: FC<{
  page: DispatchPage;
  editMode: boolean;
  onAddButton: () => void;
  onEditButton: (button: DispatchButton) => void;
  onAddWidget: (widgetType: DispatchWidgetType) => void;
  onEditWidget: (widget: DispatchWidget) => void;
}> = ({
  page,
  editMode,
  onAddButton,
  onEditButton,
  onAddWidget,
  onEditWidget,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [buttons, setButtons] = useState<DispatchButton[]>(page.buttons);
  const [widgets, setWidgets] = useState<DispatchWidget[]>(page.widgets);
  const [cellColors, setCellColors] = useState<Record<string, string>>(
    page.cellColors,
  );
  const [tool, setTool] = useState<"brush" | "fill" | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [paintColor, setPaintColor] = useState("#ffe58f");

  useEffect(() => {
    setButtons(page.buttons);
  }, [page.buttons]);

  useEffect(() => {
    setWidgets(page.widgets);
  }, [page.widgets]);

  useEffect(() => {
    setCellColors(page.cellColors);
  }, [page.cellColors]);

  const invalidateOnError = (e: ErrorResponse) => {
    errorHandler(e, messageApi);
    void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
  };

  const buttonPositionMutation = useMutation({
    mutationFn: (payload: { id: string; x: number; y: number }) =>
      client.patch("api/setting/dispatch-button/position", payload),
    onError: invalidateOnError,
  });

  const buttonSizeMutation = useMutation({
    mutationFn: (payload: { id: string; width: number; height: number }) =>
      client.patch("api/setting/dispatch-button/size", payload),
    onError: invalidateOnError,
  });

  const deleteButtonMutation = useMutation({
    mutationFn: (id: string) =>
      client.delete("api/setting/dispatch-button", { data: { id } }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const widgetPositionMutation = useMutation({
    mutationFn: (payload: { id: string; x: number; y: number }) =>
      client.patch("api/setting/dispatch-widget/position", payload),
    onError: invalidateOnError,
  });

  const widgetSizeMutation = useMutation({
    mutationFn: (payload: { id: string; width: number; height: number }) =>
      client.patch("api/setting/dispatch-widget/size", payload),
    onError: invalidateOnError,
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: (id: string) =>
      client.delete("api/setting/dispatch-widget", { data: { id } }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const cellsMutation = useMutation({
    mutationFn: (cells: Record<string, string>) =>
      client.patch("api/setting/dispatch-page/cells", {
        page_id: page.id,
        cells,
      }),
    onError: invalidateOnError,
  });

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (!tool) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-dispatch-item]")) return;

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const colAt = (clientX: number) =>
      Math.max(0, Math.floor((clientX - rect.left) / GRID_SIZE));
    const rowAt = (clientY: number) =>
      Math.max(0, Math.floor((clientY - rect.top) / GRID_SIZE));

    if (tool === "fill") {
      const filled = floodFill(
        cellColors,
        colAt(e.clientX),
        rowAt(e.clientY),
        isErasing ? null : paintColor,
        rect.width,
        rect.height,
      );
      setCellColors(filled);
      cellsMutation.mutate(filled);
      return;
    }

    let latest = cellColors;
    let lastKey = "";

    const paintAt = (clientX: number, clientY: number) => {
      const key = `${colAt(clientX)}_${rowAt(clientY)}`;
      if (key === lastKey) return;
      lastKey = key;

      latest = { ...latest };
      if (isErasing) {
        delete latest[key];
      } else {
        latest[key] = paintColor;
      }
      setCellColors(latest);
    };

    paintAt(e.clientX, e.clientY);

    const handleMove = (moveEvent: PointerEvent) => {
      paintAt(moveEvent.clientX, moveEvent.clientY);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      cellsMutation.mutate(latest);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (delta.x === 0 && delta.y === 0) return;

    const button = buttons.find((b) => b.id === active.id);
    if (button) {
      const next = {
        ...button,
        x: snapToGrid(button.x + delta.x),
        y: snapToGrid(button.y + delta.y),
      };
      setButtons((prev) => prev.map((b) => (b.id === next.id ? next : b)));
      buttonPositionMutation.mutate({ id: next.id, x: next.x, y: next.y });
      return;
    }

    const widget = widgets.find((w) => w.id === active.id);
    if (widget) {
      const next = {
        ...widget,
        x: snapToGrid(widget.x + delta.x),
        y: snapToGrid(widget.y + delta.y),
      };
      setWidgets((prev) => prev.map((w) => (w.id === next.id ? next : w)));
      widgetPositionMutation.mutate({ id: next.id, x: next.x, y: next.y });
    }
  };

  const handleButtonResizeEnd = (
    button: DispatchButton,
    width: number,
    height: number,
  ) => {
    const next = { ...button, width: snapToGrid(width), height: snapToGrid(height) };
    setButtons((prev) => prev.map((b) => (b.id === next.id ? next : b)));
    buttonSizeMutation.mutate({ id: next.id, width: next.width, height: next.height });
  };

  const handleWidgetResizeEnd = (
    widget: DispatchWidget,
    width: number,
    height: number,
  ) => {
    const next = { ...widget, width: snapToGrid(width), height: snapToGrid(height) };
    setWidgets((prev) => prev.map((w) => (w.id === next.id ? next : w)));
    widgetSizeMutation.mutate({ id: next.id, width: next.width, height: next.height });
  };

  const handleDeleteButton = (button: DispatchButton) => {
    Modal.confirm({
      title: t("mission_dispatch_board.delete_button_confirm_title"),
      okText: t("utils.confirm"),
      cancelText: t("utils.cancel"),
      onOk: () => deleteButtonMutation.mutate(button.id),
    });
  };

  const handleDeleteWidget = (widget: DispatchWidget) => {
    Modal.confirm({
      title: t("mission_dispatch_board.delete_widget_confirm_title"),
      okText: t("utils.confirm"),
      cancelText: t("utils.cancel"),
      onOk: () => deleteWidgetMutation.mutate(widget.id),
    });
  };

  const canvasHeight = useMemo(() => {
    const maxButtonY = buttons.reduce((max, b) => Math.max(max, b.y + b.height), 0);
    const maxWidgetY = widgets.reduce((max, w) => Math.max(max, w.y + w.height), 0);
    return Math.max(CANVAS_MIN_HEIGHT, maxButtonY, maxWidgetY) + 80;
  }, [buttons, widgets]);

  const canvasWidth = useMemo(() => {
    const maxButtonX = buttons.reduce((max, b) => Math.max(max, b.x + b.width), 0);
    const maxWidgetX = widgets.reduce((max, w) => Math.max(max, w.x + w.width), 0);
    return Math.max(maxButtonX, maxWidgetX) + 80;
  }, [buttons, widgets]);

  const addMenuItems = [
    { key: "button", label: t("mission_dispatch_board.add_button_card") },
    {
      key: "MISSION_LIST",
      label: t("mission_dispatch_board.add_widget_card"),
    },
    {
      key: "AMR_STATUS",
      label: t("mission_dispatch_board.add_amr_status_card"),
    },
    {
      key: "MAP_VIEW",
      label: t("mission_dispatch_board.add_map_view_card"),
    },
    {
      key: "TEXT",
      label: t("mission_dispatch_board.add_text_card"),
    },
    {
      key: "QUICK_MISSION",
      label: t("mission_dispatch_board.add_quick_mission_card"),
    },
  ];

  return (
    <>
      {contextHolder}
      <DndContext onDragEnd={handleDragEnd}>
        <CanvasScrollArea>
          <Canvas
            ref={canvasRef}
            $showGrid={editMode}
            $height={canvasHeight}
            $width={canvasWidth}
            $paintMode={editMode && tool !== null}
            onPointerDown={handleCanvasPointerDown}
          >
            {Object.entries(cellColors).map(([key, color]) => {
              const [col, row] = key.split("_").map(Number);
              return (
                <PaintedCell
                  key={key}
                  $color={color}
                  style={{ left: col * GRID_SIZE, top: row * GRID_SIZE }}
                />
              );
            })}
            {editMode && (
              <Dropdown
                menu={{
                  items: addMenuItems,
                  onClick: ({ key }) =>
                    key === "button"
                      ? onAddButton()
                      : onAddWidget(key as DispatchWidgetType),
                }}
                trigger={["click"]}
              >
                <AddButton>
                  <PlusOutlined style={{ fontSize: 20 }} />
                </AddButton>
              </Dropdown>
            )}
            {editMode && (
              <PaintToolbar
                onPointerDown={(e) => e.stopPropagation()}
                data-dispatch-item="true"
              >
                <ToolButton
                  $active={tool === "brush"}
                  onClick={() =>
                    setTool((prev) => (prev === "brush" ? null : "brush"))
                  }
                  title={t("mission_dispatch_board.paint_mode")}
                >
                  <BgColorsOutlined />
                </ToolButton>
                <ToolButton
                  $active={tool === "fill"}
                  onClick={() =>
                    setTool((prev) => (prev === "fill" ? null : "fill"))
                  }
                  title={t("mission_dispatch_board.fill_mode")}
                >
                  <FormatPainterOutlined />
                </ToolButton>
                {tool && (
                  <>
                    <ColorPicker
                      value={paintColor}
                      format="hex"
                      onChange={(color) => {
                        setPaintColor(color.toHexString());
                        setIsErasing(false);
                      }}
                    />
                    <ToolButton
                      $active={isErasing}
                      onClick={() => setIsErasing((prev) => !prev)}
                      title={t("mission_dispatch_board.eraser")}
                    >
                      <ClearOutlined />
                    </ToolButton>
                  </>
                )}
              </PaintToolbar>
            )}
            {buttons.map((button) => (
              <DispatchButtonCard
                key={button.id}
                button={button}
                editMode={editMode}
                onEdit={() => onEditButton(button)}
                onDelete={() => handleDeleteButton(button)}
                onResizeEnd={(width, height) =>
                  handleButtonResizeEnd(button, width, height)
                }
              />
            ))}
            {widgets.map((widget) => {
              const WidgetCard =
                widget.widget_type === "AMR_STATUS"
                  ? AmrStatusWidgetCard
                  : widget.widget_type === "MAP_VIEW"
                    ? MapViewWidgetCard
                    : widget.widget_type === "TEXT"
                      ? TextWidgetCard
                      : widget.widget_type === "QUICK_MISSION"
                        ? QuickMissionWidgetCard
                        : MissionListWidgetCard;
              return (
                <WidgetCard
                  key={widget.id}
                  widget={widget}
                  editMode={editMode}
                  onEdit={() => onEditWidget(widget)}
                  onDelete={() => handleDeleteWidget(widget)}
                  onResizeEnd={(width, height) =>
                    handleWidgetResizeEnd(widget, width, height)
                  }
                />
              );
            })}
          </Canvas>
        </CanvasScrollArea>
      </DndContext>
      {buttons.length === 0 && widgets.length === 0 && !editMode && (
        <EmptyHint>{t("mission_dispatch_board.empty_page_hint")}</EmptyHint>
      )}
    </>
  );
};

export default DispatchCanvas;
