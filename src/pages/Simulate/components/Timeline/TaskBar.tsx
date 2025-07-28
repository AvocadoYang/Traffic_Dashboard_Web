import { FC, memo } from "react";
import styled from "styled-components";

type TaskType = {
  startMinute: number;
  duration: number;
  priority: number;
  time: string;
  type: string;
};

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
`;

const TaskBar: FC<{
  top: number;
  barMainColor: string;
  handleEditTimeline: (time: string) => void;
  task: TaskType;
}> = ({ task, top, barMainColor, handleEditTimeline }) => {
  return (
    <TaskBarSty
      left={task.startMinute * 10}
      width={task.duration * 20}
      top={top}
      barMainColor={barMainColor}
      onClick={() => handleEditTimeline(task.time)}
    >
      {task.time}
    </TaskBarSty>
  );
};

export default memo(
  TaskBar,
  (prev, next) =>
    prev.task.time === next.task.time &&
    prev.barMainColor === next.barMainColor,
);
