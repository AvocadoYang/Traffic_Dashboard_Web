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

const TimelineWrapper = styled.div`
  position: absolute;
  z-index: 4;
  width: 95%;
  height: 10em;
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
  transition: opacity 0.3s ease-in-out;
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

const TaskLayer = styled.div`
  position: absolute;
  bottom: 23px;
  left: 15px;
  height: 20px;
  pointer-events: none;
  z-index: 10;
  display: flex;
`;

const TaskBar = styled.div<{ left: number; width: number }>`
  position: absolute;
  height: 100%;
  background-color: #4caf50;
  border-radius: 4px;
  left: ${(props) => props.left}px;
  width: ${(props) => props.width}px;
  pointer-events: auto;
  z-index: 11;
`;

const Timeline: FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectTime, setSelectTime] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [tasks, setTasks] = useState([
    { startMinute: 60, duration: 60, name: "任務 A" },
  ]);

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

  return (
    <>
      <TimelineWrapper
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
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

        <TaskLayer>
          {tasks.map((task, idx) => (
            <TaskBar
              key={idx}
              left={task.startMinute * 10 * 2}
              width={task.duration * 10 * 2}
              title={task.name}
            />
          ))}
        </TaskLayer>
      </TimelineWrapper>

      <InsertModal
        isOpen={isModalOpen}
        selectTime={selectTime}
        setIsOpen={setIsModalOpen}
        handleClose={handleClose}
      />
    </>
  );
};

export default Timeline;
