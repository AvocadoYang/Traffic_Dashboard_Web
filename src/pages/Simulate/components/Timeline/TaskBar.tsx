import client from "@/api/axiosClient";
import { TaskType } from "@/types/timeline";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Checkbox, Flex, message, Tooltip } from "antd";
import { FC, memo, useMemo } from "react";
import styled from "styled-components";

// Interface for custom props
interface EditSectionProps {
  barMainColor: string;
}

const TaskBarSty = styled.div<{
  left: number;
  width: number;
  top: number;
  barMainColor: string;
}>`
  position: absolute;
  height: 20px;
  background-color: ${(props) => props.barMainColor};
  border-radius: 4px;
  left: ${(props) => props.left}px;
  width: ${(props) => props.width}px;
  top: ${(props) => props.top}px;
  pointer-events: auto;
  z-index: 9;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: 0 0.5em;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);

  &:hover {
    opacity: 0.9;
    transform: scale(1.02);
    transition: all 0.2s ease;
  }

  @media (max-width: 768px) {
    padding: 0 0.3em;
    height: 18px;
  }
`;

const EditSection = styled.div<EditSectionProps>`
  width: 80%;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(props) => getTextColor(props.barMainColor || "#000000")};
  font-size: 12px;
`;

const getTextColor = (bgColor: string) => {
  // Simple luminance check to determine if text should be light or dark
  const r = parseInt(bgColor.slice(1, 3), 16);
  const g = parseInt(bgColor.slice(3, 5), 16);
  const b = parseInt(bgColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
};

const TaskBar: FC<{
  top: number;
  barMainColor: string;
  handleEditTimeline: (time: string, type: string) => void;
  task: TaskType;
}> = ({ task, top, barMainColor, handleEditTimeline }) => {
  const [messageApi, contextHolder] = message.useMessage();

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; isEnable: boolean }) =>
      client.post("api/simulate/enable-timeline-mission", payload),
    onSuccess: () => {
      void messageApi.success("success");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleEnable = () => {
    editMutation.mutate({ id: task.id, isEnable: !task.isEnable });
  };

  const RenderText = useMemo(() => {
    if (task.type === "MISSION") {
      switch (task.timelineMission?.type) {
        case "DYNAMIC":
          const dynamicMissions =
            task.timelineMission.dynamicMission
              ?.map((e) => `${e.loadFrom} -> ${e.offloadTo}`)
              .join(", ") || "";
          return dynamicMissions.length > 20
            ? `${dynamicMissions.slice(0, 20)}...`
            : dynamicMissions;
        case "NOTIFY":
          return task.timelineMission.notifyMissionSourcePointName || "";
        case "NORMAL":
          return task.timelineMission.normalMissionName || "";
      }
    }

    if (task.type === "SPAWN_CARGO") {
      const text = `spawn at ${task.timelineSpawnCargo?.peripheralType} ${task.timelineSpawnCargo?.peripheralName}`;
      return text.length > 20 ? `${text.slice(0, 20)}...` : text;
    }

    if (task.type === "SHIFT_CARGO") {
      const text = `shift to ${task.timelineShiftCargo?.peripheralType} ${task.timelineShiftCargo?.shiftPeripheralName}`;
      return text.length > 20 ? `${text.slice(0, 20)}...` : text;
    }
    return "";
  }, [task]);

  const fullText = useMemo(() => {
    if (task.type === "MISSION" && task.timelineMission?.type === "DYNAMIC") {
      return (
        task.timelineMission.dynamicMission
          ?.map((e) => `${e.loadFrom} -> ${e.offloadTo}`)
          .join(", ") || ""
      );
    }
    if (task.type === "SPAWN_CARGO") {
      return `spawn at ${task.timelineSpawnCargo?.peripheralType} ${task.timelineSpawnCargo?.peripheralName}`;
    }
    if (task.type === "SHIFT_CARGO") {
      return `shift to ${task.timelineShiftCargo?.peripheralType} ${task.timelineShiftCargo?.shiftPeripheralName}`;
    }
    return "";
  }, [task]);

  return (
    <>
      {contextHolder}
      <TaskBarSty
        left={task.startMinute * 10}
        width={task.duration * 20}
        top={top}
        barMainColor={barMainColor}
      >
        <Tooltip title={fullText}>
          <EditSection
            barMainColor={barMainColor}
            onClick={() => handleEditTimeline(task.time, task.type)}
          >
            {RenderText}
          </EditSection>
        </Tooltip>
        <Checkbox checked={task.isEnable} onClick={handleEnable} />
      </TaskBarSty>
    </>
  );
};

export default memo(
  TaskBar,
  (prev, next) =>
    prev.task.time === next.task.time &&
    prev.barMainColor === next.barMainColor,
);
