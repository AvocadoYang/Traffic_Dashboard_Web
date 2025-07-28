import styled from "styled-components";
import { InputNumber, Modal, Tooltip } from "antd";
import {
  FC,
  useState,
  useRef,
  useEffect,
  WheelEvent,
  MouseEvent,
  ReactNode,
} from "react";
import CustomTooltip from "./CustomTooltip";
import EachBlock from "./EachBlock";
import InsertModal from "./InsertModal";
import {
  Mission_Schedule,
  useTimelineScheduleSocket,
} from "@/sockets/useTimelineScheduleSocket";
import { useTranslation } from "react-i18next";

type TaskType = {
  startMinute: number;
  duration: number;
  priority: number;
  time: string;
  type: string;
};

const SwitchHeight = styled.div`
  position: absolute;
  z-index: 5;
  top: 15%;
  left: 20px;
  transform: translateY(-50%);
  background-color: #f5f5f5;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  transition: opacity 0.3s ease-in-out;
  width: 3em;
  height: 3em;
  padding: 1em 0em;
  justify-content: space-between;

  &:hover {
    opacity: 1;
  }
`;

const TimelineWrapper = styled.div<{ heightMode: string }>`
  position: absolute;
  z-index: 4;
  width: 95%;
  height: ${(props) =>
    props.heightMode === "full"
      ? "100vh"
      : props.heightMode === "mini"
        ? "5em"
        : "10em"};
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
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

  &:hover {
    opacity: 1;
  }

  &:active {
    cursor: grabbing;
  }
`;

const TimeLayer = styled.div`
  position: absolute;
  bottom: 23px;
  left: 15px;
  height: 20px;
  z-index: 12;
  display: flex;
  align-items: center;
`;

const TaskLayer = styled.div<{ height: number; wrapperHeight: string }>`
  position: absolute;
  bottom: ${(props) => (props.wrapperHeight === "100vh" ? "50px" : "45px")};
  left: 15px;
  height: ${(props) => props.height}px;
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
`;

const TaskBar = styled.div<{
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


const Timeline: FC = () => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectTime, setSelectTime] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [heightMode, setHeightMode] = useState<"mini" | "normal" | "full">(
    "normal",
  );

const taskBarMainColor = (type: string) => {
  switch (type.toUpperCase()) {
    case "DYNAMIC":
      return "#4CAF50"; // Vibrant green
    case "NOTIFY":
      return "#FBC02D"; // Warm yellow
    case "NORMAL":
      return "#1976D2"; // Rich blue
    default:
      return "#757575"; // Neutral gray
  }
};


  const scheduleData = useTimelineScheduleSocket();

  useEffect(() => {
    const updatedTasks = scheduleData.map((mission: Mission_Schedule) => ({
      startMinute: timeToMinutes(mission.time),
      priority: mission.priority,
      time: mission.time,
      type: mission.type,
      duration: 10,
    }));
    setTasks(updatedTasks);
  }, [scheduleData]);

  const { rowAssignments, rowCount } = assignTaskRows(tasks);

  const handleMarkerClick = (minute: number) => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
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

  const toggleHeightMode = () => {
    setHeightMode((prevMode) =>
      prevMode === "mini" ? "normal" : prevMode === "normal" ? "full" : "mini",
    );
  };

  return (
    <>
      <Tooltip
        title={t("sim.timeline.change_timeline_height")}
        placement="right"
      >
        <SwitchHeight onClick={toggleHeightMode}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <title>ruler</title>
            <path d="M1.39,18.36L3.16,16.6L4.58,18L5.64,16.95L4.22,15.54L5.64,14.12L8.11,16.6L9.17,15.54L6.7,13.06L8.11,11.65L9.53,13.06L10.59,12L9.17,10.59L10.59,9.17L13.06,11.65L14.12,10.59L11.65,8.11L13.06,6.7L14.47,8.11L15.54,7.05L14.12,5.64L15.54,4.22L18,6.7L19.07,5.64L16.6,3.16L18.36,1.39L22.61,5.64L5.64,22.61L1.39,18.36Z" />
          </svg>
        </SwitchHeight>
      </Tooltip>

      <TimelineWrapper
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        heightMode={heightMode}
      >
        <TimeLayer>
          {hours.map(({ time, isHour, minute, index }) => (
            <EachBlock
              key={index}
              time={time}
              isHour={isHour}
              minute={minute}
              index={index}
              setSelectTime={setSelectTime}
              handleMarkerClick={handleMarkerClick}
            />
          ))}
        </TimeLayer>

        <TaskLayer height={rowCount * 25} wrapperHeight={heightMode}>
          {tasks.map((task, idx) => (
            <TaskBar
              key={idx}
              left={task.startMinute * 10}
              width={task.duration * 20}
              top={rowAssignments[idx] * 25}
              barMainColor={taskBarMainColor(task.type)}
            >{task.time}</TaskBar>
          ))}
        </TaskLayer>

        <InsertModal
          isOpen={isModalOpen}
          selectTime={selectTime}
          setIsOpen={setIsModalOpen}
          handleClose={handleClose}
        />
      </TimelineWrapper>
    </>
  );
};

export default Timeline;
