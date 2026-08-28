import { DispatchWidget } from "@/api/useMissionDispatchBoard";
import BtnGroup from "@/pages/Main/Car_Card/components/BtnGroup";
import {
  useAmrDestination,
  useAmrDetail,
  useIsLogIn,
} from "@/sockets/useAMRInfo";
import { Modal } from "antd";
import React, { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchItemFrame from "./DispatchItemFrame";
import {
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
} from "./gridConstants";

const Card = styled.div<{ $width: number; $height: number; $editable: boolean }>`
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
  cursor: ${({ $editable }) => ($editable ? "grab" : "pointer")};

  &:hover {
    box-shadow: ${({ $editable }) =>
      $editable ? "0 2px 6px rgba(0, 0, 0, 0.15)" : "0 4px 12px rgba(0, 0, 0, 0.25)"};
  }
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OnlineDot = styled.span<{ $online: boolean }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $online }) => ($online ? "#52c41a" : "#d9d9d9")};
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #595959;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;

  span:last-child {
    color: #262626;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const AmrStatusWidgetCard: FC<{
  widget: DispatchWidget;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ widget, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();
  const amrId = widget.amrId ?? "";
  const detail = useAmrDetail(amrId);
  const { isOnline, isOverdue } = useIsLogIn(amrId);
  const { destination } = useAmrDestination(amrId);
  const [controlOpen, setControlOpen] = useState(false);

  const online = isOnline && !isOverdue;

  return (
    <>
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
            $editable={editMode}
            onClick={() => {
              if (!editMode) setControlOpen(true);
            }}
          >
            <TitleBar>
              <OnlineDot $online={online} />
              {widget.title || amrId}
            </TitleBar>
            <Body>
              <Row>
                <span>{t("mission_dispatch_board.amr_battery")}</span>
                <span>
                  {detail ? `${Math.round(detail.battery)}%` : "-"}
                </span>
              </Row>
              <Row>
                <span>{t("mission_dispatch_board.amr_status")}</span>
                <span>{detail?.status || "-"}</span>
              </Row>
              <Row>
                <span>{t("mission_dispatch_board.amr_location")}</span>
                <span>{detail?.locationId || "-"}</span>
              </Row>
              {destination?.name && (
                <Row>
                  <span>{t("mission_dispatch_board.amr_destination")}</span>
                  <span>{destination.name}</span>
                </Row>
              )}
            </Body>
          </Card>
        )}
      </DispatchItemFrame>

      <Modal
        title={amrId}
        open={controlOpen}
        onCancel={() => setControlOpen(false)}
        footer={null}
        destroyOnClose
      >
        {amrId && <BtnGroup amrId={amrId} />}
      </Modal>
    </>
  );
};

export default AmrStatusWidgetCard;
