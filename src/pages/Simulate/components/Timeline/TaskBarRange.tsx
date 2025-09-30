import client from "@/api/axiosClient";
import { TaskType } from "@/types/timeline";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Checkbox, Flex, message, Tooltip } from "antd";
import { FC, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
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

const TaskBarRange: FC<{
  top: number;
  barMainColor: string;
  task: TaskType;
}> = ({ task, top, barMainColor }) => {
  const { t } = useTranslation();
  let info = "";

  if (task.type === "SHIFT_CARGO_GROUP")
    info = `${t("sim.shift_cargo_group.shift_group")} ${task.timelineShiftCargoGroup?.shiftGroupname} | ${t("sim.shift_cargo_group.range")} ${task.timelineShiftCargoGroup?.range}`;
  if (task.type === "SPAWN_CARGO_GROUP")
    info = `${t("sim.spawn_cargo_group.spawn_group")} ${task.timelineSpawnCargoGroup?.spawnGroupname} | ${t("sim.spawn_cargo_group.range")} ${task.timelineSpawnCargoGroup?.range}`;
  if (task.type === "MISSION")
    info = `${t("sim.dynamic_mission_group.mission_group")} ${task.timelineMission?.dynamicMissionPeripheralGroup?.task.map((w) => `${w.loadGroupName} -> ${w.offloadGroupName}`)} | ${t("sim.dynamic_mission_group.range")} ${task.timelineMission?.dynamicMissionPeripheralGroup?.range}`;

  console.log("==================");
  console.log(info);
  console.log(task.startMinute, "start min ===");
  console.log(task.duration, "duration =======");
  console.log("==================");

  return (
    <>
      <TaskBarSty
        left={task.startMinute * 10}
        width={task.duration * 10}
        top={top}
        barMainColor={barMainColor}
      >
        <EditSection barMainColor={barMainColor}>{info}</EditSection>

        <Checkbox checked={task.isEnable} />
      </TaskBarSty>
    </>
  );
};

// export default memo(
//   TaskBar,
//   (prev, next) =>
//     prev.task.time === next.task.time &&
//     prev.barMainColor === next.barMainColor,
// );

export default TaskBarRange;
