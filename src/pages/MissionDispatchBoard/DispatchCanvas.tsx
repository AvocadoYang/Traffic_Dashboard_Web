import client from "@/api/axiosClient";
import {
  DISPATCH_PAGE_QUERY_KEY,
  DispatchButton,
  DispatchPage,
  DispatchWidget,
} from "@/api/useMissionDispatchBoard";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { PlusOutlined } from "@ant-design/icons";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dropdown, Modal, message } from "antd";
import React, { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchButtonCard from "./DispatchButtonCard";
import MissionListWidgetCard from "./MissionListWidgetCard";
import { GRID_SIZE, snapToGrid } from "./gridConstants";

const CANVAS_MIN_HEIGHT = 400;

const Canvas = styled.div<{ $showGrid: boolean; $height: number }>`
  position: relative;
  width: 100%;
  height: ${({ $height }) => $height}px;
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

const DispatchCanvas: FC<{
  page: DispatchPage;
  editMode: boolean;
  onAddButton: () => void;
  onEditButton: (button: DispatchButton) => void;
  onAddWidget: () => void;
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
  const [buttons, setButtons] = useState<DispatchButton[]>(page.buttons);
  const [widgets, setWidgets] = useState<DispatchWidget[]>(page.widgets);

  useEffect(() => {
    setButtons(page.buttons);
  }, [page.buttons]);

  useEffect(() => {
    setWidgets(page.widgets);
  }, [page.widgets]);

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

  const addMenuItems = [
    { key: "button", label: t("mission_dispatch_board.add_button_card") },
    { key: "mission_list", label: t("mission_dispatch_board.add_widget_card") },
  ];

  return (
    <>
      {contextHolder}
      <DndContext onDragEnd={handleDragEnd}>
        <Canvas $showGrid={editMode} $height={canvasHeight}>
          {editMode && (
            <Dropdown
              menu={{
                items: addMenuItems,
                onClick: ({ key }) =>
                  key === "button" ? onAddButton() : onAddWidget(),
              }}
              trigger={["click"]}
            >
              <AddButton>
                <PlusOutlined style={{ fontSize: 20 }} />
              </AddButton>
            </Dropdown>
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
          {widgets.map((widget) => (
            <MissionListWidgetCard
              key={widget.id}
              widget={widget}
              editMode={editMode}
              onEdit={() => onEditWidget(widget)}
              onDelete={() => handleDeleteWidget(widget)}
              onResizeEnd={(width, height) =>
                handleWidgetResizeEnd(widget, width, height)
              }
            />
          ))}
        </Canvas>
      </DndContext>
      {buttons.length === 0 && widgets.length === 0 && !editMode && (
        <EmptyHint>{t("mission_dispatch_board.empty_page_hint")}</EmptyHint>
      )}
    </>
  );
};

export default DispatchCanvas;
