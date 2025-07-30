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
import { ValidationError, array, boolean, number, object, string } from "yup";
import { MissionPriority } from "@/types/mission";
import { Cargo } from "@/types/peripheral";

const schema = array(
  object({
    id: string().required(),
    time: string().required(),
    type: string().required(),
    isEnable: boolean().required(),
    styleRow: number().required(),

    spawnCargoInfo_id: string().nullable().optional(),
    shiftPeripheral_id: string().nullable().optional(),
    shiftPeripheralName: string().nullable().optional(),

    spawnCargoInfo: object({
      cargoInfoId: string().nullable(),
      customCargoMetadataId: string().nullable(),
      metadata: string().nullable(),
    })
      .nullable()
      .optional(),

    timelineMission: object({
      type: string().required(),
      priority: number().required(),
      amrId: string().required(),

      normalMissionId: string().nullable().optional(),
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

  spawnCargoInfo_id?: string;
  spawnCargoInfo?: Cargo | null;
  shiftPeripheral_id?: string;
  shiftPeripheralName?: string;

  timelineMission?: {
    type: string;
    priority: MissionPriority;
    amrId: string;
    normalMissionId?: string | null;
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
