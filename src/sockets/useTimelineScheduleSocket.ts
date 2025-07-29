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
import { ValidationError, array, number, object, string } from "yup";
import { MissionPriority } from "@/types/mission";

const schema = array(
  object({
    id: string().required(),
    time: string().required(),
    priority: number().required(),
    amrId: string().required(),
    type: string().required(),

    normalMissionId: string().optional().nullable(),
    notifyMissionSourcePointName: string().optional().nullable(),
    dynamicMission: array(
      object({
           loadFromId: string().required(),
        loadFrom: string().required(),
        offloadToId: string().required(),
        offloadTo: string().required(),
      }),
    )
      .optional()
      .nullable(),
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
  priority: MissionPriority;
  amrId: string;
  type: string;

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
        setData(data);
      });

    return () => {
      scriptStatus.unsubscribe();
    };
  }, []);

  return data;
};
