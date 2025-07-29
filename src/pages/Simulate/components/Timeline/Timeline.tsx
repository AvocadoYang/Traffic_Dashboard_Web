import styled from "styled-components";
import { FormInstance, message } from "antd";
import { FC, useState, useRef, useEffect, MouseEvent } from "react";
import InsertModal from "./InsertModal";
import {
  Mission_Schedule,
  useTimelineScheduleSocket,
} from "@/sockets/useTimelineScheduleSocket";
import { useTranslation } from "react-i18next";
import TaskBar from "./TaskBar";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  EditTask,
  IsEditSchedule,
  OpenEditModal,
  SelectTime,
  TimelineHeight,
} from "../../utils/mapStatus";
import TimeLayer from "./TimeLayer";
import { PlusOutlined } from "@ant-design/icons";

type TaskType = {
  startMinute: number;
  duration: number;
  priority: number;
  time: string;
  type: string;
};

const TimelineWrapper = styled.div<{ heightMode: string; isDragging: boolean }>`
  position: absolute;
  z-index: 4;
  width: 95%;
  height: ${(props) =>
    props.heightMode === "full"
      ? "90vh"
      : props.heightMode === "mini"
        ? "5em"
        : "10em"};
  bottom: 20px;
  left: 50%;
  transform: translateX(-48%);
  background-color: #f5f5f5;
  border-radius: 20px;
  padding: 10px 15px 23px;
  display: flex;
  align-items: flex-start;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  gap: 10px;
  opacity: 0.9;
  transition:
    opacity 0.3s ease-in-out,
    height 0.3s ease-in-out;
  overflow-x: auto;
  white-space: nowrap;
  cursor: grab;
  box-sizing: border-box;
  position: fixed;
  user-select: ${(props) => (props.isDragging ? "none" : "auto")};
  display: flex;
  &:hover {
    opacity: 1;
  }

  &:active {
    cursor: grabbing;
  }
`;

const TaskLayer = styled.div<{ height: number; wrapperHeight: string }>`
  position: absolute;
  bottom: ${(props) => (props.wrapperHeight === "90vh" ? "50px" : "45px")};
  left: 15px;
  height: ${(props) => props.height}px;
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
`;

const AddSchedule = styled.div<{ scrollLeft: number }>`
  width: 2em;
  height: 2em;
  background-color: #f5f5f5;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 5;
  transition: opacity 0.3s ease-in-out;
  opacity: 0.9;
  position: absolute;
  top: 10px;
  left: ${(props) => props.scrollLeft + 15}px;
  transition:
    left 0.1s ease-in-out,
    opacity 0.1s ease-in-out;

  &:hover {
    opacity: 1;
  }
`;

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const assignTaskRows = (tasks: { startMinute: number; duration: number }[]) => {
  const sortedTasks = [...tasks].sort((a, b) => a.startMinute - b.startMinute);
  const rows: { start: number; end: number }[][] = [[]];
  const rowAssignments: number[] = [];

  sortedTasks.forEach((task, index) => {
    const taskStart = task.startMinute;
    const taskEnd = task.startMinute + task.duration;

    let placed = false;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const hasOverlap = row.some(
        (t) => taskStart < t.end && taskEnd > t.start,
      );
      if (!hasOverlap) {
        row.push({ start: taskStart, end: taskEnd });
        rowAssignments[index] = rowIndex;
        placed = true;
        break;
      }
    }

    if (!placed) {
      rows.push([{ start: taskStart, end: taskEnd }]);
      rowAssignments[index] = rows.length - 1;
    }
  });

  return { rowAssignments, rowCount: rows.length };
};

const hours = Array.from({ length: 24 * 60 }, (_, i) => {
  const hour = Math.floor(i / 60);
  const minute = i % 60;
  return {
    time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    isHour: minute === 0,
    minute,
    index: i,
  };
});

const Timeline: FC = () => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isEdit, setIsEdit] = useAtom(IsEditSchedule);
  const [startX, setStartX] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectTime, setSelectTime] = useAtom(SelectTime); //給編輯貨新增用
  const setIsModalOpen = useSetAtom(OpenEditModal); // 編輯任務或是新增任務的
  const [tasks, setTasks] = useState<TaskType[]>([]); // 把socket資料轉換後show在前端
  const setEditTask = useSetAtom(EditTask);
  const scheduleData = useTimelineScheduleSocket(); // 即時任務socket
  const heightMode = useAtomValue(TimelineHeight);
  const [scrollLeft, setScrollLeft] = useState(0);

  const taskBarMainColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "DYNAMIC":
        return "#4CAF50";
      case "NOTIFY":
        return "#FBC02D";
      case "NORMAL":
        return "#1976D2";
      default:
        return "#757575";
    }
  };

  useEffect(() => {
    const updatedTasks = scheduleData.map((mission: Mission_Schedule) => ({
      startMinute: timeToMinutes(mission.time),
      priority: mission.priority,
      time: mission.time,
      type: mission.type,
      duration: 10,
    }));
    // console.log('change')
    setTasks(updatedTasks);
  }, [scheduleData]);

  useEffect(() => {
    if (!isEdit) {
      setEditTask(null);
      return;
    }

    const target = scheduleData.find((v) => {
      return v.time === selectTime;
    });
    if (!target) {
      message.error("can not found mission data!!");
      return;
    }
    setIsModalOpen(true);
    setEditTask(target);
  }, [isEdit]);

  const { rowAssignments, rowCount } = assignTaskRows(tasks);

  const handleMarkerClick = () => {
    setIsModalOpen(true);
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button === 0) {
      setIsDragging(true);
      setStartX(event.clientX + (timelineRef.current?.scrollLeft || 0));
    }
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (isDragging && timelineRef.current) {
      const newScroll = startX - event.clientX;
      timelineRef.current.scrollLeft = newScroll;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleEditTimeline = (time: string) => {
    setIsEdit(true);
    setSelectTime(time);
  };

  const directAddSchedule = () => {
    setIsEdit(false);
    setIsModalOpen(true);
    setSelectTime("08:00");
  };

  useEffect(() => {
    const handleScroll = () => {
      if (timelineRef.current) {
        setScrollLeft(timelineRef.current.scrollLeft);
      }
    };

    const timelineElement = timelineRef.current;
    if (timelineElement) {
      timelineElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (timelineElement) {
        timelineElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  return (
    <>
      <TimelineWrapper
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        heightMode={heightMode}
        isDragging={isDragging}
      >
        <AddSchedule scrollLeft={scrollLeft}>
          <PlusOutlined onClick={directAddSchedule} />
        </AddSchedule>

        <TimeLayer
          hours={hours}
          setSelectTime={setSelectTime}
          handleMarkerClick={handleMarkerClick}
        />

        <TaskLayer height={rowCount * 25} wrapperHeight={heightMode}>
          {tasks.map((task, idx) => (
            <TaskBar
              key={idx}
              task={task}
              top={rowAssignments[idx] * 25}
              barMainColor={taskBarMainColor(task.type)}
              handleEditTimeline={handleEditTimeline}
            />
          ))}
        </TaskLayer>
      </TimelineWrapper>
    </>
  );
};

export default Timeline;
