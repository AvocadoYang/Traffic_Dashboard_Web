import client from "@/api/axiosClient";
import { DispatchWidget } from "@/api/useMissionDispatchBoard";
import { MissionInfo, useMissions } from "@/sockets/useMissions";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { DeleteOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Modal, message } from "antd";
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  executing: { bg: "#f6ffed", text: "#52c41a" },
  assigned: { bg: "#e6f7ff", text: "#1890ff" },
  pending: { bg: "#fff7e6", text: "#faad14" },
  completed: { bg: "#fafafa", text: "#8c8c8c" },
  aborting: { bg: "#fff1f0", text: "#ff4d4f" },
  canceled: { bg: "#fff1f0", text: "#ff4d4f" },
};

const Card = styled.div<{ $width: number; $height: number }>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
`;

const TitleBar = styled.div`
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;

  & + & {
    border-top: 1px solid #f5f5f5;
  }
`;

const StatusTag = styled.span<{ $status: string }>`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $status }) =>
    (STATUS_COLORS[$status] ?? STATUS_COLORS.pending).bg};
  color: ${({ $status }) =>
    (STATUS_COLORS[$status] ?? STATUS_COLORS.pending).text};
`;

const AmrLabel = styled.span`
  flex-shrink: 0;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
`;

const MissionLabel = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #595959;
`;

const DeleteMissionIcon = styled(DeleteOutlined)`
  flex-shrink: 0;
  color: #bfbfbf;
  cursor: pointer;

  &:hover {
    color: #ff4d4f;
  }
`;

const EmptyRow = styled.div`
  padding: 16px;
  text-align: center;
  color: #bfbfbf;
  font-size: 12px;
`;

const missionLabel = (m: MissionInfo) =>
  m.full_name?.filter(Boolean).join(" / ") || m.sub_name || m.missionId;

const MissionListWidgetCard: FC<{
  widget: DispatchWidget;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ widget, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { missions } = useMissions();

  const deleteMissionMutation = useMutation({
    mutationFn: (mission: MissionInfo) =>
      client.post("/api/missions/delete-mission", {
        selectedMission: [
          {
            amrId: mission.amrId,
            missionId: mission.missionId,
            status: mission.missionStatus,
          },
        ],
      }),
    onSuccess: () => void messageApi.success(t("utils.success")),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleDeleteMission = (
    e: React.MouseEvent | React.PointerEvent,
    mission: MissionInfo,
  ) => {
    e.stopPropagation();
    Modal.confirm({
      title: t("mission_dispatch_board.delete_mission_confirm_title"),
      okText: t("utils.confirm"),
      cancelText: t("utils.cancel"),
      onOk: () => deleteMissionMutation.mutate(mission),
    });
  };

  return (
    <>
      {contextHolder}
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
          <Card $width={width} $height={height}>
            <TitleBar>
              {widget.title ||
                t("mission_dispatch_board.mission_list_widget")}
            </TitleBar>
            <List>
              {missions.length === 0 && (
                <EmptyRow>{t("mission_dispatch_board.no_missions")}</EmptyRow>
              )}
              {missions.map((m) => (
                <Row key={m.missionId}>
                  <StatusTag $status={m.missionStatus}>
                    {m.missionStatus}
                  </StatusTag>
                  {m.amrId && <AmrLabel>{m.amrId}</AmrLabel>}
                  <MissionLabel>{missionLabel(m)}</MissionLabel>
                  <DeleteMissionIcon
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleDeleteMission(e, m)}
                  />
                </Row>
              ))}
            </List>
          </Card>
        )}
      </DispatchItemFrame>
    </>
  );
};

export default MissionListWidgetCard;
