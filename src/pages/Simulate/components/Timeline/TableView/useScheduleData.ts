// hooks/useScheduleData.ts
import { useState, useEffect, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Local_Range_Table_Value, Local_Table_Value } from "./type";
import { useTranslation } from "react-i18next";
import { Mission_Schedule } from "@/types/timeline";

// Utility functions
const toMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

const getIntervalCount = (range: string, activeInterval: number): number => {
  if (!range || !range.includes("-") || activeInterval <= 0) {
    return 0;
  }

  try {
    const [startStr, endStr] = range.split("-");
    const start = toMinutes(startStr.trim());
    const end = toMinutes(endStr.trim());

    if (end <= start) return 0;

    const diff = end - start;
    return Math.floor(diff / activeInterval);
  } catch (error) {
    console.warn("Invalid range format:", range);
    return 0;
  }
};

// Helper function to safely get interval value
const getIntervalValue = (interval: number | undefined): string => {
  if (interval === undefined || interval === -1 || interval === 0) {
    return "Not Set";
  }
  return interval.toString();
};

const useScheduleData = (scheduleData: Mission_Schedule[]) => {
  const { t } = useTranslation();

  // Filter states
  const [isFilterMission, setIsFilterMission] = useState(true);
  const [isFilterSpawnCargo, setIsFilterSpawnCargo] = useState(true);
  const [isFilterShiftCargo, setIsFilterShiftCargo] = useState(true);
  const [timeRange, setTimeRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [searchText, setSearchText] = useState("");

  // Local state for processed data
  const [localFixEvent, setLocalFixEvent] = useState<Local_Table_Value[]>([]);
  const [localRangeEvent, setLocalRangeEvent] = useState<
    Local_Range_Table_Value[]
  >([]);

  // Task detail generators
  const getFixedTaskDetail = (task: Mission_Schedule): string => {
    switch (task.type) {
      case "MISSION":
        return getMissionDetail(task);
      case "SPAWN_CARGO":
        return `spawn at ${task.timelineSpawnCargo?.peripheralType || ""} ${task.timelineSpawnCargo?.peripheralName || ""}`;
      case "SHIFT_CARGO":
        return `shift to ${task.timelineShiftCargo?.peripheralType || ""} ${task.timelineShiftCargo?.shiftPeripheralName || ""}`;
      default:
        return "";
    }
  };

  const getMissionDetail = (task: Mission_Schedule): string => {
    if (task.type !== "MISSION" || !task.timelineMission) return "";

    switch (task.timelineMission.type) {
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

      default:
        return "Unknown mission type";
    }
  };

  const getGroupTaskDetail = (task: Mission_Schedule): string => {
    const intervalTitle = t("sim.spawn_cargo_group.gap_time");
    const rangeTitle = t("sim.spawn_cargo_group.range");
    const peripheralTitle = t("sim.spawn_cargo_group.peripheral_group");

    switch (task.type) {
      case "MISSION": {
        if (task.timelineMission?.type !== "GROUP_TO_GROUP") return "";
        const group = task.timelineMission.dynamicMissionPeripheralGroup;
        const intervalTime = getIntervalValue(group?.activeInterval);
        const tasks =
          group?.task?.map(
            (s) => `${s.loadGroupName} -> ${s.offloadGroupName}`,
          ) || [];

        return `${intervalTitle}: ${intervalTime} | ${rangeTitle}: ${group?.range || ""} | Tasks: ${tasks.join(", ")}`;
      }

      case "SPAWN_CARGO_GROUP": {
        const sg = task.timelineSpawnCargoGroup;
        const intervalTime = getIntervalValue(sg?.activeInterval);

        return `${intervalTitle}: ${intervalTime} | ${rangeTitle}: ${sg?.range || ""} | ${peripheralTitle}: ${sg?.spawnGroupname || ""}`;
      }

      case "SHIFT_CARGO_GROUP": {
        const sg = task.timelineShiftCargoGroup;
        const intervalTime = getIntervalValue(sg?.activeInterval);

        return `${intervalTitle}: ${intervalTime} | ${rangeTitle}: ${sg?.range || ""} | ${peripheralTitle}: ${sg?.shiftGroupname || ""}`;
      }

      default:
        return "";
    }
  };

  const getInterval = (task: Mission_Schedule): string => {
    switch (task.type) {
      case "MISSION":
        if (task.timelineMission?.type === "GROUP_TO_GROUP") {
          return getIntervalValue(
            task.timelineMission.dynamicMissionPeripheralGroup?.activeInterval,
          );
        }
        break;
      case "SPAWN_CARGO_GROUP":
        return getIntervalValue(task.timelineSpawnCargoGroup?.activeInterval);
      case "SHIFT_CARGO_GROUP":
        return getIntervalValue(task.timelineShiftCargoGroup?.activeInterval);
    }
    return "";
  };

  const getRange = (task: Mission_Schedule): string => {
    switch (task.type) {
      case "MISSION":
        if (task.timelineMission?.type === "GROUP_TO_GROUP") {
          return (
            task.timelineMission.dynamicMissionPeripheralGroup?.range || ""
          );
        }
        break;
      case "SPAWN_CARGO_GROUP":
        return task.timelineSpawnCargoGroup?.range || "";
      case "SHIFT_CARGO_GROUP":
        return task.timelineShiftCargoGroup?.range || "";
    }
    return "";
  };

  const getActiveTimes = (task: Mission_Schedule): number => {
    let range = "";
    let interval = 0;

    switch (task.type) {
      case "MISSION":
        if (task.timelineMission?.type === "GROUP_TO_GROUP") {
          const group = task.timelineMission.dynamicMissionPeripheralGroup;
          range = group?.range || "";
          interval = group?.activeInterval || 0;
        }
        break;
      case "SPAWN_CARGO_GROUP":
        range = task.timelineSpawnCargoGroup?.range || "";
        interval = task.timelineSpawnCargoGroup?.activeInterval || 0;
        break;
      case "SHIFT_CARGO_GROUP":
        range = task.timelineShiftCargoGroup?.range || "";
        interval = task.timelineShiftCargoGroup?.activeInterval || 0;
        break;
    }

    if (!range || interval <= 0) return 0;
    return getIntervalCount(range, interval);
  };

  const getRangeDetail = (task: Mission_Schedule): string => {
    const peripheralTitle = t("sim.spawn_cargo_group.peripheral_group");

    switch (task.type) {
      case "MISSION":
        if (task.timelineMission?.type === "GROUP_TO_GROUP") {
          const tasks =
            task.timelineMission.dynamicMissionPeripheralGroup?.task?.map(
              (s) => `${s.loadGroupName} -> ${s.offloadGroupName}`,
            ) || [];
          return `${t("utils.amr_id")}: ${task.timelineMission.amrId} | Task: ${tasks}`;
        }
        break;
      case "SPAWN_CARGO_GROUP":
        return `${peripheralTitle}: ${task.timelineSpawnCargoGroup?.spawnGroupname || ""}`;
      case "SHIFT_CARGO_GROUP":
        return `${peripheralTitle}: ${task.timelineShiftCargoGroup?.shiftGroupname || ""}`;
    }
    return "";
  };

  // Apply filters helper
  const applyTypeFilters = <T extends { type: string }>(items: T[]): T[] => {
    return items.filter((v) => {
      if (v.type === "MISSION" && !isFilterMission) return false;
      if (v.type === "SPAWN_CARGO" && !isFilterSpawnCargo) return false;
      if (v.type === "SHIFT_CARGO" && !isFilterShiftCargo) return false;
      return true;
    });
  };

  const applyTimeRangeFilter = <T extends { time: string }>(
    items: T[],
  ): T[] => {
    if (!timeRange || !timeRange[0] || !timeRange[1]) return items;

    return items.filter((v) => {
      const t = dayjs(v.time, "HH:mm");
      return t.isAfter(timeRange[0]) && t.isBefore(timeRange[1]);
    });
  };

  const applySearchFilter = <
    T extends { time: string; type: string; detail: string },
  >(
    items: T[],
  ): T[] => {
    if (!searchText.trim()) return items;

    const searchLower = searchText.toLowerCase();
    return items.filter(
      (v) =>
        v.time.toLowerCase().includes(searchLower) ||
        v.type.toLowerCase().includes(searchLower) ||
        v.detail.toLowerCase().includes(searchLower),
    );
  };

  // Process fixed events
  const processedFixEvents = useMemo(() => {
    if (!scheduleData?.length) return [];

    let filtered = scheduleData
      .filter((v) => v.eventType === "FIXED")
      .map((v) => ({
        id: v.id,
        time: v.time,
        type: v.type,
        detail: getFixedTaskDetail(v),
      }));

    // Apply all filters
    filtered = applyTypeFilters(filtered);
    filtered = applyTimeRangeFilter(filtered);
    filtered = applySearchFilter(filtered);

    return filtered;
  }, [
    scheduleData,
    isFilterMission,
    isFilterSpawnCargo,
    isFilterShiftCargo,
    timeRange,
    searchText,
    t, // Add translation dependency
  ]);

  // Process range events
  const processedRangeEvents = useMemo(() => {
    if (!scheduleData?.length) return [];

    const filteredRangeLogic: Local_Range_Table_Value[] = [];
    const seenIds = new Set<string>();

    scheduleData
      .filter((v) => v.eventType === "GROUP")
      .forEach((v) => {
        if (seenIds.has(v.id)) return; // Skip duplicates early

        const newObject: Local_Range_Table_Value = {
          id: v.id,
          time: v.time,
          type: v.type,
          intervalTime: getInterval(v),
          range: getRange(v),
          activeTimes: getActiveTimes(v),
          detail: getRangeDetail(v),
        };

        seenIds.add(v.id);
        filteredRangeLogic.push(newObject);
      });

    // Apply search filter
    return applySearchFilter(filteredRangeLogic);
  }, [scheduleData, searchText, t]); // Add translation dependency

  // Update local state when processed data changes
  useEffect(() => {
    setLocalFixEvent(processedFixEvents);
  }, [processedFixEvents]);

  useEffect(() => {
    setLocalRangeEvent(processedRangeEvents);
  }, [processedRangeEvents]);

  // Return hook interface
  return {
    // Data
    localFixEvent,
    localRangeEvent,

    // Filter states
    isFilterMission,
    isFilterSpawnCargo,
    isFilterShiftCargo,
    timeRange,

    // Filter setters
    setIsFilterMission,
    setIsFilterSpawnCargo,
    setIsFilterShiftCargo,
    setTimeRange,
    setSearchText,

    // Additional utilities (if needed)
    searchText,
    hasData: scheduleData?.length > 0,
    totalFixedEvents: processedFixEvents.length,
    totalRangeEvents: processedRangeEvents.length,
  } as const;
};

export default useScheduleData;
