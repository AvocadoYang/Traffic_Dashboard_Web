import client from "@/api/axiosClient";
import useAmrName from "@/api/useAmrName";
import { DispatchWidget } from "@/api/useMissionDispatchBoard";
import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Button, Select, message } from "antd";
import { useAtom } from "jotai";
import React, { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchItemFrame from "./DispatchItemFrame";
import {
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
} from "./gridConstants";

enum MissionPriority {
  TRIVIAL,
  NORMAL,
  PIVOTAL,
  CRITICAL,
}

const AUTO_ASSIGN = "__auto__";

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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  cursor: default;
`;

const ArmingHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  color: #1890ff;
`;

const PickRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PickLabel = styled.span`
  flex-shrink: 0;
  width: 44px;
  color: #8c8c8c;
`;

const PickValue = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: #262626;
`;

const QuickMissionWidgetCard: FC<{
  widget: DispatchWidget;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ widget, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: amrData } = useAmrName();
  const [load, setLoad] = useAtom(QuickMissionLoad);
  const [offload, setOffload] = useAtom(QuickMissionOffload);
  const [isArming, setIsArming] = useAtom(StartQuickMissionSetting);
  const [armMode, setArmMode] = useAtom(QuickMissionSettingMode);
  const [amrId, setAmrId] = useState(AUTO_ASSIGN);
  const [priority, setPriority] = useState<number>(MissionPriority.NORMAL);

  // 這顆元件被移除/切走分頁時,如果剛好還在點選中或已經選好一半,
  // 把全域的選取狀態清掉,避免殘留影響到 Main 頁面自己的快速任務面板。
  useEffect(() => {
    return () => {
      setLoad(null);
      setOffload(null);
      setIsArming(false);
      setArmMode(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amrOptions = useMemo(() => {
    if (!amrData) return [{ value: AUTO_ASSIGN, label: t("utils.random") }];
    const filtered = amrData.isSim
      ? amrData.amrs.filter((a) => a.isReal === false)
      : amrData.amrs.filter((a) => a.isReal === true);
    return [
      { value: AUTO_ASSIGN, label: t("utils.random") },
      ...filtered.map((a) => ({ value: a.amrId, label: a.amrId })),
    ];
  }, [amrData, t]);

  const armPick = (mode: "load" | "offload") => {
    if (mode === "load") setLoad(null);
    else setOffload(null);
    setArmMode(mode);
    setIsArming(true);
  };

  const cancelArm = () => {
    setIsArming(false);
    setArmMode(null);
  };

  const fireMutation = useMutation({
    mutationFn: () =>
      client.post("api/missions/fast-mission", {
        amrId: amrId === AUTO_ASSIGN ? "none" : amrId,
        priority,
        ept_s: load?.columnName,
        ept_d: offload?.columnName,
      }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setLoad(null);
      setOffload(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const canSubmit = Boolean(load || offload);

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
              {widget.title || t("mission_dispatch_board.quick_mission_widget")}
            </TitleBar>
            <Body onPointerDown={(e) => e.stopPropagation()}>
              {isArming && (
                <ArmingHint>
                  <span>
                    {armMode === "load"
                      ? t("mission_dispatch_board.quick_mission_pick_load_hint")
                      : t("mission_dispatch_board.quick_mission_pick_offload_hint")}
                  </span>
                  <a onClick={cancelArm}>{t("utils.cancel")}</a>
                </ArmingHint>
              )}

              <PickRow>
                <PickLabel>{t("mission_dispatch_board.pickup_point")}</PickLabel>
                <PickValue>{load?.columnName ?? "-"}</PickValue>
                <Button size="small" onClick={() => armPick("load")}>
                  {t("mission_dispatch_board.pick_on_map")}
                </Button>
              </PickRow>

              <PickRow>
                <PickLabel>{t("mission_dispatch_board.dropoff_point")}</PickLabel>
                <PickValue>{offload?.columnName ?? "-"}</PickValue>
                <Button size="small" onClick={() => armPick("offload")}>
                  {t("mission_dispatch_board.pick_on_map")}
                </Button>
              </PickRow>

              <Select<string>
                size="small"
                value={amrId}
                options={amrOptions}
                onChange={setAmrId}
              />

              <Select<number>
                size="small"
                value={priority}
                onChange={setPriority}
                options={[
                  {
                    value: MissionPriority.TRIVIAL,
                    label: t("main.mission_modal.dialog_mission.priority.TRIVIAL"),
                  },
                  {
                    value: MissionPriority.NORMAL,
                    label: t("main.mission_modal.dialog_mission.priority.NORMAL"),
                  },
                  {
                    value: MissionPriority.PIVOTAL,
                    label: t("main.mission_modal.dialog_mission.priority.PIVOTAL"),
                  },
                  {
                    value: MissionPriority.CRITICAL,
                    label: t("main.mission_modal.dialog_mission.priority.CRITICAL"),
                  },
                ]}
              />

              <Button
                type="primary"
                size="small"
                disabled={!canSubmit}
                loading={fireMutation.isPending}
                onClick={() => fireMutation.mutate()}
              >
                {t("mission_dispatch_board.dispatch")}
              </Button>
            </Body>
          </Card>
        )}
      </DispatchItemFrame>
    </>
  );
};

export default QuickMissionWidgetCard;
