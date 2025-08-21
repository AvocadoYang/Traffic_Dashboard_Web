// hooks/useScheduleData.ts
import { useState, useEffect, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Local_Table_Value } from "./type";
import { useTranslation } from "react-i18next";
import { Mission_Schedule } from "@/types/timeline";

const useScheduleData = (scheduleData: Mission_Schedule[]) => {
  const { t } = useTranslation();
  const [isFilterMission, setIsFilterMission] = useState(true);
  const [isFilterSpawnCargo, setIsFilterSpawnCargo] = useState(true);
  const [isFilterShiftCargo, setIsFilterShiftCargo] = useState(true);
  const [timeRange, setTimeRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [searchText, setSearchText] = useState("");
  const [localFixEvent, setLocalFixEvent] = useState<Local_Table_Value[]>([]);
  const [localRangeEvent, setLocalRangeEvent] = useState<Local_Table_Value[]>(
    [],
  );

  const getTaskDetail = (task: Mission_Schedule): string => {
    if (task.type === "MISSION") {
      switch (task.timelineMission?.type) {
        case "DYNAMIC":
          const dynamicMissions =
            task.timelineMission.dynamicMission
              ?.map((e) => `${e.loadFrom} -> ${e.offloadTo}`)
              .join(", ") || "";
          return `${task.timelineMission.amrId} | ${dynamicMissions}`;
        case "NOTIFY":
          return `${task.timelineMission.amrId} | ${task.timelineMission.notifyMissionSourcePointName || ""}`;
        case "NORMAL":
          return `${task.timelineMission.amrId} | ${task.timelineMission.normalMissionName || ""}`;
        case "GROUP_TO_GROUP":
          const group = task.timelineMission.dynamicMissionPeripheralGroup;

          const intervalTitle = t("sim.spawn_cargo_group.gap_time");
          const intervalTime =
            group?.activeInterval === -1 || group?.activeInterval === 0
              ? "Not Set"
              : group?.activeInterval;

          const rangeTitle = t("sim.spawn_cargo_group.range");
          const peripheralTitle = t("sim.spawn_cargo_group.peripheral_group");

          return `${intervalTitle}:${intervalTime} | ${rangeTitle}: ${group?.range || ""} | ${group?.task?.map((s) => `${s.loadGroupName} -> ${s.offloadGroupName}`) || ""}`;
        default:
          return "not exist type";
      }
    }

    if (task.type === "SPAWN_CARGO_GROUP") {
      const sg = task.timelineSpawnCargoGroup;

      const intervalTitle = t("sim.spawn_cargo_group.gap_time");
      const intervalTime =
        sg?.activeInterval === -1 || sg?.activeInterval === 0
          ? "Not Set"
          : sg?.activeInterval;

      const rangeTitle = t("sim.spawn_cargo_group.range");
      const peripheralTitle = t("sim.spawn_cargo_group.peripheral_group");

      return `${intervalTitle}:${intervalTime} | ${rangeTitle}: ${sg?.range || ""} | ${peripheralTitle}: ${sg?.spawnGroupname || ""}`;
    }

    if (task.type === "SHIFT_CARGO_GROUP") {
      const sg = task.timelineShiftCargoGroup;

      const intervalTitle = t("sim.spawn_cargo_group.gap_time");
      const intervalTime =
        sg?.activeInterval === -1 || sg?.activeInterval === 0
          ? "Not Set"
          : sg?.activeInterval;

      const rangeTitle = t("sim.spawn_cargo_group.range");
      const peripheralTitle = t("sim.spawn_cargo_group.peripheral_group");

      return `${intervalTitle}:${intervalTime} | ${rangeTitle}: ${sg?.range || ""} | ${peripheralTitle}: ${sg?.shiftGroupname || ""}`;
    }

    if (task.type === "SPAWN_CARGO") {
      return `spawn at ${task.timelineSpawnCargo?.peripheralType || ""} ${task.timelineSpawnCargo?.peripheralName || ""}`;
    }

    if (task.type === "SHIFT_CARGO") {
      return `shift to ${task.timelineShiftCargo?.peripheralType || ""} ${task.timelineShiftCargo?.shiftPeripheralName || ""}`;
    }
    return "";
  };

  const processedFixEvents = useMemo(() => {
    if (!scheduleData?.length) return [];

    let filtered = scheduleData
      .filter((v) => v.eventType === "FIXED")
      .map((v) => ({
        id: v.id,
        time: v.time,
        type: v.type,
        detail: getTaskDetail(v),
      }));

    // Apply type filters
    filtered = filtered.filter((v) => {
      if (v.type === "MISSION" && !isFilterMission) return false;
      if (v.type === "SPAWN_CARGO" && !isFilterSpawnCargo) return false;
      if (v.type === "SHIFT_CARGO" && !isFilterShiftCargo) return false;
      return true;
    });

    // Apply time range filter
    if (timeRange && timeRange[0] && timeRange[1]) {
      filtered = filtered.filter((v) => {
        const t = dayjs(v.time, "HH:mm");
        return t.isAfter(timeRange[0]) && t.isBefore(timeRange[1]);
      });
    }

    // Apply search filter
    if (searchText.trim()) {
      filtered = filtered.filter(
        (v) =>
          v.time.toLowerCase().includes(searchText.toLowerCase()) ||
          v.type.toLowerCase().includes(searchText.toLowerCase()) ||
          v.detail.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    return filtered;
  }, [
    scheduleData,
    isFilterMission,
    isFilterSpawnCargo,
    isFilterShiftCargo,
    timeRange,
    searchText,
  ]);

  const processedRangeEvents = useMemo(() => {
    if (!scheduleData?.length) return [];

    const filteredRangeLogic: Local_Table_Value[] = [];
    const seenIds = new Set();

    scheduleData
      .filter((v) => v.eventType === "GROUP")
      .forEach((v) => {
        const newObject = {
          id: v.id,
          time: v.time,
          type: v.type,
          detail: getTaskDetail(v),
        };

        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          filteredRangeLogic.push(newObject);
        }
      });

    // Apply search filter to range events
    if (searchText.trim()) {
      return filteredRangeLogic.filter(
        (v) =>
          v.time.toLowerCase().includes(searchText.toLowerCase()) ||
          v.type.toLowerCase().includes(searchText.toLowerCase()) ||
          v.detail.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    return filteredRangeLogic;
  }, [scheduleData, searchText]);

  useEffect(() => {
    setLocalFixEvent(processedFixEvents);
  }, [processedFixEvents]);

  useEffect(() => {
    setLocalRangeEvent(processedRangeEvents);
  }, [processedRangeEvents]);

  return {
    localFixEvent,
    localRangeEvent,
    isFilterMission,
    isFilterSpawnCargo,
    isFilterShiftCargo,
    timeRange,
    setIsFilterMission,
    setIsFilterSpawnCargo,
    setIsFilterShiftCargo,
    setTimeRange,
    setSearchText,
  };
};

export default useScheduleData;
