import {
  filter,
  from,
  fromEventPattern,
  share,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { isDefined } from "ts-extras";
import { io } from "./socketConnect";
import { useState, useEffect } from "react";
import {
  ValidationError,
  array,
  boolean,
  mixed,
  number,
  object,
  string,
} from "yup";
import { MissionPriority } from "@/types/mission";
import { Cargo } from "@/types/peripheral";

export const schema = array(
  object({
    id: string().required(),
    time: string().required(),
    type: string().oneOf(["MISSION", "SPAWN_CARGO", "SHIFT_CARGO"]).required(),
    isEnable: boolean().required(),
    styleRow: number().required(),

    timelineShiftCargo: object({
      peripheralType: string().nullable().optional(),
      shiftPeripheralId: string().nullable().optional(),
      shiftPeripheralName: string().nullable().optional(),
    })
      .nullable()
      .optional(),

    timelineSpawnCargo: object({
      peripheralType: string().nullable().optional(),
      peripheralNameId: string().nullable().optional(),
      peripheralName: string().nullable().optional(),
      spawnCargoInfo: object({
        cargoInfoId: string().nullable(),
        customCargoMetadataId: string().nullable(),
        metadata: mixed().nullable(),
      })
        .nullable()
        .optional(),
    })
      .nullable()
      .optional(),

    timelineMission: object({
      type: string().optional().nullable(),
      priority: number().optional().nullable(),
      amrId: string().optional().nullable(),

      normalMissionName: string().nullable().optional(),
      normalMissionId: string().nullable().optional(),
      notifyMissionSourcePointNameId: string().nullable().optional(),
      notifyMissionSourcePointName: string().nullable().optional(),

      dynamicMission: array(
        object({
          loadFromId: string().required(),
          loadFrom: string().required(),
          offloadToId: string().required(),
          offloadTo: string().required(),
        }),
      )
        .nullable()
        .optional(),
    })
      .nullable()
      .optional(),
  }),
).required();

const getC$ = fromEventPattern(
  (next) => {
    io.on("timeline-schedule", next);
    return next;
  },
  (next) => {
    io.off("timeline-schedule", next);
  },
).pipe(
  switchMap((msg) =>
    from(
      schema
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("script mismatch: ", err.value);
          return undefined;
        }),
    ),
  ),
  filter(isDefined),
  share(),
);

export type Mission_Schedule = {
  id: string;
  time: string; // e.g 15:10
  type: string;
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

  timelineMission?: {
    type: string;
    priority: MissionPriority;
    amrId: string;
    normalMissionId?: string | null;
    normalMissionName?: string | null;
    notifyMissionSourcePointNameId?: string | null;
    notifyMissionSourcePointName?: string | null;
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

export const useTimelineScheduleSocket = () => {
  const [data, setData] = useState<Mission_Schedule[]>([]);

  useEffect(() => {
    const scriptStatus = getC$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
      )
      .subscribe((data) => {
        setData(data as Mission_Schedule[]);
      });

    return () => {
      scriptStatus.unsubscribe();
    };
  }, []);

  return data;
};
