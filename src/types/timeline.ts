import { MissionPriority } from "./mission";

export type TaskType = {
  id: string;
  startMinute: number;
  duration: number;
  time: string;
  eventType: Timeline_Event_Type;
  type: Timeline_Schedule_Type;
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
    type?: Timeline_Mission_Type;
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

export type Timeline_Event_Type = "GROUP" | "FIXED";
export type Timeline_Schedule_Type =
  | "SPAWN_CARGO"
  | "SHIFT_CARGO"
  | "MISSION"
  | "SPAWN_CARGO_GROUP"
  | "SHIFT_CARGO_GROUP";
export type Timeline_Mission_Type =
  | "DYNAMIC"
  | "NOTIFY"
  | "NORMAL"
  | "GROUP_TO_GROUP";

export type Mission_Schedule = {
  id: string;
  time: string; // e.g 15:10
  eventType: Timeline_Event_Type;
  type: Timeline_Schedule_Type;
  isEnable: boolean;
  styleRow: number;

  timelineShiftCargo?: {
    shiftPeripheralId?: string;
    shiftPeripheralName?: string; // 這邊有關peripheral 的name都應該先預先處理好 把字尾的script name刪掉
    peripheralType?: string;
  } | null;

  timelineSpawnCargo?: {
    spawnCargoInfo?: {
      cargoInfoId: string | null;
      customCargoMetadataId: string | null;
      metadata: Record<string, unknown>;
    } | null;

    peripheralType?: string;
    peripheralNameId?: string;
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
    type: Timeline_Mission_Type;
    priority: MissionPriority;
    amrId: string;
    normalMissionId?: string | null;
    normalMissionName?: string | null;
    notifyMissionSourcePointNameId?: string | null;
    notifyMissionSourcePointName?: string | null;
    dynamicMissionPeripheralGroup?: {
      groupId: string; // new, unique id for this group
      range?: string; // e.g. "00:00-01:00"
      activeInterval: number; // minutes
      task: {
        loadGroupName: string;
        loadGroupId: string;
        offloadGroupName: string;
        offloadGroupId: string;
      }[];
    } | null;
    dynamicMission?:
      | {
          loadFromId: string;
          loadFrom: string;
          offloadToId: string;
          offloadTo: string;
        }[]
      | null;
  } | null;
};
