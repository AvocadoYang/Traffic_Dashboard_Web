import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Checkbox, Flex, message } from "antd";
import { FC, memo } from "react";
import styled from "styled-components";

type TaskType = {
  id: string;
  startMinute: number;
  duration: number;
  priority: number;
  time: string;
  type: string;
  styleRow: number;
  isEnable: boolean;
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
  display: flex;
  justify-content: space-between;
  padding: 0 0.3em;
  align-items: center;
`;

const EditSection = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
`;

const TaskBar: FC<{
  top: number;
  barMainColor: string;
  handleEditTimeline: (time: string) => void;
  task: TaskType;
}> = ({ task, top, barMainColor, handleEditTimeline }) => {
  const [messageApi, contextHolder] = message.useMessage();

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; isEnable: boolean }) => {
      return client.post("api/simulate/enable-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleEnable = () => {
    editMutation.mutate({ id: task.id, isEnable: !task.isEnable });
  };

  return (
    <>
      {contextHolder}

      <TaskBarSty
        left={task.startMinute * 10}
        width={task.duration * 20}
        top={top}
        barMainColor={barMainColor}
      >
        <EditSection onClick={() => handleEditTimeline(task.time)}>
          {task.time}
        </EditSection>

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
