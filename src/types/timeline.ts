export type TaskType = {
  id: string;
  startMinute: number;
  duration: number;
  time: string;
  type: string;
  missionType: string | null;
  styleRow: number;
  isEnable: boolean;

  timelineShiftCargo?: {
    shiftPeripheralName?: string;
    peripheralType?: string;
  } | null;

  timelineSpawnCargo?: {
    peripheralType?: string;
    peripheralName?: string;
  };

  timelineSpawnCargoGroup?: {
    groupId: string; // new, unique id for this group
    range?: string; // e.g. "00:00-01:00"
    activeInterval: number;
    isSpawnAll?: boolean;
    spawnNumber?: number;
    spawnGroupId?: string;
    spawnGroupname?: string;
  };

  timelineShiftCargoGroup?: {
    groupId: string; // new, unique id for this group
    range?: string; // e.g. "00:00-01:00"
    activeInterval: number;
    isShiftAll?: boolean;
    shiftNumber?: number;
    shiftGroupId?: string;
    shiftGroupname?: string;
  };

  timelineMission?: {
    amrId?: string | null;
    type?: string;
    normalMissionName?: string | null;
    notifyMissionSourcePointName?: string | null;
    dynamicMissionPeripheralGroup?: {
      range?: string; // e.g. "00:00-01:00"
      activeInterval: number; // minutes
      task: {
        loadGroupName: string;
        offloadGroupName: string;
      }[];
    } | null;
    dynamicMission?:
      | {
          loadFrom: string;
          offloadTo: string;
        }[]
      | null;
  } | null;
};
