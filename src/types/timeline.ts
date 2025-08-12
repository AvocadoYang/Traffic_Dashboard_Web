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

  timelineMission?: {
    amrId?: string | null;
    type?: string;
    normalMissionName?: string | null;
    notifyMissionSourcePointName?: string | null;
    dynamicMission?:
      | {
          loadFrom: string;
          offloadTo: string;
        }[]
      | null;
  } | null;
};
