import styled from "styled-components";
import { FormInstance, message, Tooltip } from "antd";
import { FC, useState, useRef, useEffect, MouseEvent } from "react";
import InsertModal from "./Modals/InsertModal";
import { useTimelineScheduleSocket } from "@/sockets/useTimelineScheduleSocket";
import { useTranslation } from "react-i18next";
import TaskBar from "./TaskBar";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  EditTask,
  IsEditSchedule,
  OpenEditModal,
  OpenEditShiftCargoModal,
  OpenEditSpawnCargoModal,
  SelectTime,
  TimelineHeight,
} from "../../utils/mapStatus";
import TimeLayer from "./TimeLayer";
import { PlusOutlined } from "@ant-design/icons";
import { Mission_Schedule, TaskType } from "@/types/timeline";
import TaskBarRange from "./TaskBarRange";

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

const FixItemWrapper = styled.div<{ scrollLeft: number }>`
  display: flex;
  position: absolute;
  top: 10px;
  left: ${(props) => props.scrollLeft + 15}px;
  transition:
    left 0.1s ease-in-out,
    opacity 0.1s ease-in-out;
  z-index: 15;
  gap: 2em;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  &:hover {
    opacity: 1;
  }
`;

const BtnWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2em;
`;

const AddSchedule = styled.div`
  width: auto;
  height: 2em;
  background-color: #f5f5f5;
  border-radius: 3%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 15;
  transition: opacity 0.3s ease-in-out;
  opacity: 0.9;
  padding: 0 0.4em;
  display: flex;
  gap: 0.3em;
  align-items: center;
  justify-content: center;
  transition:
    left 0.1s ease-in-out,
    opacity 0.1s ease-in-out;
  &:hover {
    opacity: 1;
  }
`;

const AddSpawnCargoSchedule = styled.div`
  width: auto;
  height: 2em;
  background-color: #f5f5f5;
  border-radius: 3%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 15;
  transition: opacity 0.3s ease-in-out;
  opacity: 0.9;
  padding: 0 0.4em;
  display: flex;
  gap: 0.3em;
  align-items: center;
  justify-content: center;
  transition:
    left 0.1s ease-in-out,
    opacity 0.1s ease-in-out;
  &:hover {
    opacity: 1;
  }
`;

const AddShiftCargoSchedule = styled.div`
  width: auto;
  height: 2em;
  background-color: #f5f5f5;
  border-radius: 3%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 15;
  transition: opacity 0.3s ease-in-out;
  opacity: 0.9;
  padding: 0 0.4em;
  transition:
    left 0.1s ease-in-out,
    opacity 0.1s ease-in-out;
  display: flex;
  gap: 0.3em;
  align-items: center;
  justify-content: center;
  &:hover {
    opacity: 1;
  }
`;

const ColorBlockWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.3em;
  padding-right: 4em;
`;

const ColorBlock = styled.div<{ color: string }>`
  width: 1em;
  height: 1em;
  background-color: ${(props) => props.color};
  border-radius: 2px;
  cursor: help;
  margin-left: 0.5em;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
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
  const [selectTime, setSelectTime] = useAtom(SelectTime);
  const setIsModalOpen = useSetAtom(OpenEditModal);
  const setIsShiftCargoModalOpen = useSetAtom(OpenEditShiftCargoModal);
  const setIsSpawnCargoModalOpen = useSetAtom(OpenEditSpawnCargoModal);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const setEditTask = useSetAtom(EditTask);
  const scheduleData = useTimelineScheduleSocket();
  const heightMode = useAtomValue(TimelineHeight);
  const [scrollLeft, setScrollLeft] = useState(0);
  // console.log(scheduleData,'sche')
  const taskBarMainColor = (
    type: string,
    missionType: string | null,
    isEnable: boolean,
  ) => {
    if (isEnable === false) return "#c2c2c2";

    if (type === "MISSION") {
      if (!missionType) return "#6b6b6b";
      switch (missionType.toUpperCase()) {
        case "DYNAMIC":
          return "#4CAF50";
        case "NOTIFY":
          return "#FBC02D";
        case "NORMAL":
          return "#1976D2";
        default:
          return "#757575";
      }
    }

    switch (type.toUpperCase()) {
      case "SPAWN_CARGO":
        return "#f066eb";
      case "SHIFT_CARGO":
        return "#2dc3fd";
      default:
        return "#757575";
    }
  };

  const getColorMeaning = (color: string) => {
    switch (color.toUpperCase()) {
      case "#4CAF50":
        return t("sim.timeline.dynamic_mission");
      case "#FBC02D":
        return t("sim.timeline.notify_mission");
      case "#1976D2":
        return t("sim.timeline.normal_mission");
      case "#F066EB":
        return t("sim.timeline.spawn_cargo");
      case "#2DC3FD":
        return t("sim.timeline.shift_cargo");
      case "#C2C2C2":
        return t("sim.timeline.disabled");
      default:
        return t("sim.timeline.unknown");
    }
  };

  useEffect(() => {
    const updatedTasks: TaskType[] = scheduleData.map(
      (mission: Mission_Schedule) => {
        let startMinute = timeToMinutes(mission.time);
        let duration = 10;

        if (mission.eventType === "GROUP") {
          if (
            mission.type === "MISSION" &&
            mission.timelineMission?.type === "GROUP_TO_GROUP"
          ) {
            const arr =
              mission.timelineMission?.dynamicMissionPeripheralGroup?.range?.split(
                "-",
              ) as string[];

            if (arr && arr.length >= 2) {
              const start = timeToMinutes(arr[0]);
              const end = timeToMinutes(arr[1]);
              startMinute = start;
              duration = end - start;
            }
          }

          if (mission.type === "SHIFT_CARGO_GROUP") {
            const arr = mission.timelineShiftCargoGroup?.range?.split(
              "-",
            ) as string[];

            if (arr && arr.length >= 2) {
              const start = timeToMinutes(arr[0]);
              const end = timeToMinutes(arr[1]);
              startMinute = start;
              duration = end - start;
            }
          }

          if (mission.type === "SPAWN_CARGO_GROUP") {
            const arr = mission.timelineSpawnCargoGroup?.range?.split(
              "-",
            ) as string[];

            if (arr && arr.length >= 2) {
              const start = timeToMinutes(arr[0]);
              const end = timeToMinutes(arr[1]);
              startMinute = start;
              duration = end - start;
            }
          }
        }

        return {
          id: mission.id,
          startMinute,
          duration, // The duration property you calculated
          time: mission.time,
          isEnable: mission.isEnable,
          styleRow: mission.styleRow,

          // This is the missing property
          eventType: mission.eventType,
          type: mission.type,
          missionType: mission.timelineMission?.type,

          // All the other properties you had before...
          timelineMission: {
            amrId: mission.timelineMission?.amrId || null,
            type: mission.timelineMission?.type,
            normalMissionName:
              mission.timelineMission?.normalMissionName || null,
            notifyMissionSourcePointName:
              mission.timelineMission?.notifyMissionSourcePointName || null,
            dynamicMission: mission.timelineMission?.dynamicMission || null,
            dynamicMissionPeripheralGroup: {
              range:
                mission.timelineMission?.dynamicMissionPeripheralGroup?.range ||
                null,
              activeInterval:
                mission.timelineMission?.dynamicMissionPeripheralGroup
                  ?.activeInterval || -1,
              task:
                mission.timelineMission?.dynamicMissionPeripheralGroup?.task?.map(
                  (v) => ({
                    loadGroupName: v.loadGroupName,
                    offloadGroupName: v.offloadGroupName,
                  }),
                ) || [],
            },
          },
          timelineShiftCargo: {
            shiftPeripheralName:
              mission.timelineShiftCargo?.shiftPeripheralName,
            peripheralType: mission.timelineShiftCargo?.peripheralType,
          },
          timelineSpawnCargo: {
            peripheralType: mission.timelineSpawnCargo?.peripheralType,
            peripheralName: mission.timelineSpawnCargo?.peripheralName,
          },
          timelineShiftCargoGroup: {
            groupId: mission.timelineShiftCargoGroup?.groupId || "",
            range: mission.timelineShiftCargoGroup?.range || null,
            activeInterval:
              mission.timelineShiftCargoGroup?.activeInterval || -1,
            isShiftAll: mission.timelineShiftCargoGroup?.isShiftAll,
            shiftNumber: mission.timelineShiftCargoGroup?.shiftNumber,
            shiftGroupId: mission.timelineShiftCargoGroup?.shiftGroupId,
            shiftGroupname: mission.timelineShiftCargoGroup?.shiftGroupname,
          },
          timelineSpawnCargoGroup: {
            groupId: mission.timelineSpawnCargoGroup?.groupId || "",
            range: mission.timelineSpawnCargoGroup?.range || null,
            activeInterval:
              mission.timelineSpawnCargoGroup?.activeInterval || -1,
            isSpawnAll: mission.timelineSpawnCargoGroup?.isSpawnAll,
            spawnNumber: mission.timelineSpawnCargoGroup?.spawnNumber,
            spawnGroupId: mission.timelineSpawnCargoGroup?.spawnGroupId,
            spawnGroupname: mission.timelineSpawnCargoGroup?.spawnGroupname,
          },
        };
      },
    );
    setTasks(updatedTasks);
  }, [scheduleData]);

  useEffect(() => {
    if (!isEdit) {
      setEditTask(null);
      return;
    }
    const target = scheduleData.find((v) => v.time === selectTime);
    if (!target) {
      message.error("can not found mission data!!");
      return;
    }
    setEditTask(target);
  }, [isEdit]);

  const { rowAssignments, rowCount } = assignTaskRows(tasks);

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

  const handleEditTimeline = (time: string, type: string, id: string) => {
    const dataIndex = scheduleData.findIndex((v) => v.id === id);

    setEditTask(scheduleData[dataIndex]);
    setSelectTime(time);

    if (type === "MISSION") {
      setIsEdit(true);
      setIsModalOpen(true);
      return;
    }
    if (type === "SPAWN_CARGO") {
      setIsEdit(true);
      setIsSpawnCargoModalOpen(true);
      return;
    }
    if (type === "SHIFT_CARGO") {
      setIsEdit(true);
      setIsShiftCargoModalOpen(true);
      return;
    }
  };

  const directAddSchedule = () => {
    setIsEdit(false);
    setIsModalOpen(true);
    setSelectTime("08:00");
  };

  const directSpawnCargoSchedule = () => {
    setIsEdit(false);
    setIsSpawnCargoModalOpen(true);
    setSelectTime("08:00");
  };

  const directShiftSchedule = () => {
    setIsEdit(false);
    setIsShiftCargoModalOpen(true);
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
        <FixItemWrapper scrollLeft={scrollLeft}>
          <BtnWrapper>
            <Tooltip title="add mission event">
              <AddSchedule onClick={directAddSchedule}>
                <PlusOutlined />
                {t("sim.timeline.add_mission")}
              </AddSchedule>
            </Tooltip>

            <Tooltip title="add shift cargo event">
              <AddShiftCargoSchedule onClick={directShiftSchedule}>
                <PlusOutlined />
                {t("sim.timeline.add_shift_cargo")}
              </AddShiftCargoSchedule>
            </Tooltip>

            <Tooltip title="add spawn cargo event">
              <AddSpawnCargoSchedule onClick={directSpawnCargoSchedule}>
                <PlusOutlined />
                {t("sim.timeline.add_spawn_cargo")}
              </AddSpawnCargoSchedule>
            </Tooltip>
          </BtnWrapper>

          {/* Color Blocks */}
          <ColorBlockWrapper>
            <Tooltip title={getColorMeaning("#4CAF50")}>
              <ColorBlock color="#4CAF50" />
            </Tooltip>
            <Tooltip title={getColorMeaning("#FBC02D")}>
              <ColorBlock color="#FBC02D" />
            </Tooltip>
            <Tooltip title={getColorMeaning("#1976D2")}>
              <ColorBlock color="#1976D2" />
            </Tooltip>
            <Tooltip title={getColorMeaning("#F066EB")}>
              <ColorBlock color="#F066EB" />
            </Tooltip>
            <Tooltip title={getColorMeaning("#2DC3FD")}>
              <ColorBlock color="#2DC3FD" />
            </Tooltip>
            <Tooltip title={getColorMeaning("#C2C2C2")}>
              <ColorBlock color="#C2C2C2" />
            </Tooltip>
          </ColorBlockWrapper>
        </FixItemWrapper>

        <TimeLayer hours={hours} setSelectTime={setSelectTime} />

        <TaskLayer height={rowCount * 25} wrapperHeight={heightMode}>
          {tasks
            .filter(({ eventType }) => eventType === "FIXED")
            .map((task, idx) => (
              <TaskBar
                key={idx}
                task={task}
                top={rowAssignments[idx] * 25}
                barMainColor={taskBarMainColor(
                  task.type,
                  task.missionType,
                  task.isEnable,
                )}
                handleEditTimeline={handleEditTimeline}
              />
            ))}
          {tasks
            .filter(({ eventType }) => eventType === "GROUP")
            .filter(
              (task, idx, arr) =>
                arr.findIndex((t) => t.id === task.id) === idx,
            )
            .map((task, idx) => (
              <TaskBarRange
                key={idx}
                task={task}
                top={rowAssignments[idx] * 25}
                barMainColor={taskBarMainColor(
                  task.type,
                  task.missionType,
                  task.isEnable,
                )}
              />
            ))}
        </TaskLayer>
      </TimelineWrapper>
    </>
  );
};

export default Timeline;
