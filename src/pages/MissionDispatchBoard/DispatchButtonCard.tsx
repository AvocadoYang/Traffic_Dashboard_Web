import client from "@/api/axiosClient";
import { DispatchButton } from "@/api/useMissionDispatchBoard";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchItemFrame from "./DispatchItemFrame";
import { MAX_BUTTON_SIZE, MIN_BUTTON_SIZE } from "./gridConstants";

const Card = styled.div<{
  $width: number;
  $height: number;
  $color: string;
  $editable: boolean;
  $fontColor: string;
  $fontSize: number;
  $fontWeight: number;
}>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  color: ${({ $fontColor }) => $fontColor};
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
  font-size: ${({ $fontSize }) => $fontSize}px;
  font-weight: ${({ $fontWeight }) => $fontWeight};
  word-break: break-word;
  cursor: ${({ $editable }) => ($editable ? "grab" : "pointer")};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  user-select: none;

  &:hover {
    box-shadow: ${({ $editable }) =>
      $editable ? "0 2px 6px rgba(0, 0, 0, 0.15)" : "0 4px 12px rgba(0, 0, 0, 0.25)"};
  }
`;

const DispatchButtonCard: FC<{
  button: DispatchButton;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ button, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const fireMutation = useMutation({
    mutationFn: () => {
      if (button.dispatch_type === "MIR") {
        // MIR 任務走既有的 QueueMirTaskModal 同一支端點
        return client.post("api/setting/queue-mir-task", {
          amrId: button.amrId,
          missionName: button.missionName,
          priority: button.priority,
        });
      }
      const amrId = button.amrId ?? "none";
      if (button.dispatch_type === "NORMAL") {
        return client.post("api/missions/dialog-mission", {
          amrId,
          priority: button.priority,
          titleId: button.missionTitleId,
        });
      }
      return client.post("api/missions/fast-mission", {
        amrId,
        priority: button.priority,
        ept_s: button.ept_s,
        ept_d: button.ept_d,
      });
    },
    onSuccess: () => void messageApi.success(t("utils.success")),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  return (
    <>
      {contextHolder}
      <DispatchItemFrame
        id={button.id}
        x={button.x}
        y={button.y}
        width={button.width}
        height={button.height}
        editMode={editMode}
        minWidth={MIN_BUTTON_SIZE}
        maxWidth={MAX_BUTTON_SIZE}
        minHeight={MIN_BUTTON_SIZE}
        maxHeight={MAX_BUTTON_SIZE}
        onEdit={onEdit}
        onDelete={onDelete}
        onResizeEnd={onResizeEnd}
      >
        {({ width, height }) => (
          <Card
            $width={width}
            $height={height}
            $color={button.color}
            $editable={editMode}
            $fontColor={button.fontColor}
            $fontSize={button.fontSize}
            $fontWeight={button.fontWeight}
            onClick={() => {
              if (!editMode) fireMutation.mutate();
            }}
          >
            {button.label}
          </Card>
        )}
      </DispatchItemFrame>
    </>
  );
};

export default DispatchButtonCard;
