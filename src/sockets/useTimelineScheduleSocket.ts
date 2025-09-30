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
import { Mission_Schedule } from "@/types/timeline";

export const schema = array(
  object({
    id: string().required(),
    time: string().required(),
    eventType: string().oneOf(["GROUP", "FIXED"]),
    type: string()
      .oneOf([
        "MISSION",
        "SPAWN_CARGO",
        "SHIFT_CARGO",
        "SPAWN_CARGO_GROUP",
        "SHIFT_CARGO_GROUP",
      ])
      .required(),
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

    // ✅ NEW: timelineSpawnCargoGroup
    timelineSpawnCargoGroup: object({
      groupId: string().nullable().optional(),
      range: string().nullable().optional(),
      activeInterval: number().nullable().optional(),
      isSpawnAll: boolean().nullable().optional(),
      spawnNumber: number().nullable().optional(),
      spawnGroupId: string().nullable().optional(),
      spawnGroupname: string().nullable().optional(),
    })
      .nullable()
      .optional(),

    // ✅ NEW: timelineShiftCargoGroup
    timelineShiftCargoGroup: object({
      groupId: string().nullable().optional(),
      range: string().nullable().optional(),
      activeInterval: number().nullable().optional(),
      isShiftAll: boolean().nullable().optional(),
      shiftNumber: number().nullable().optional(),
      shiftGroupId: string().nullable().optional(),
      shiftGroupname: string().nullable().optional(),
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
      dynamicMissionPeripheralGroup: object({
        groupId: string().nullable().optional(),
        range: string().nullable().optional(),
        activeInterval: number().nullable().optional(),
        task: array(
          object({
            loadGroupName: string().nullable().optional(),
            loadGroupId: string().nullable().optional(),
            offloadGroupName: string().nullable().optional(),
            offloadGroupId: string().nullable().optional(),
          }),
        )
          .nullable()
          .optional(),
      })
        .nullable()
        .optional(),
      dynamicMission: array(
        object({
          loadFromId: string().nullable().optional(),
          loadFrom: string().nullable().optional(),
          offloadToId: string().nullable().optional(),
          offloadTo: string().nullable().optional(),
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
