import { useEffect, useState } from "react";
import {
  filter,
  from,
  fromEventPattern,
  map,
  pluck,
  share,
  distinctUntilChanged,
  switchMap,
} from "rxjs";
import { isDefined, objectKeys } from "ts-extras";
import {
  array,
  boolean,
  date,
  mixed,
  number,
  object,
  string,
  ValidationError,
} from "yup";
import { InferObservableType } from "@/utils/globalType";
import { io } from "./socketConnect";
import { CancelReason } from "@/types/mission";

const missionTypeMap = {
  sprinkle: "sprinkle",
  shipment: "shipment",
  custom: "custom",
  "remove-pallet": "remove-pallet",
  "plain-move": "plain-move",
  "deliver-pallet": "deliver-pallet",
} as const;

const missionStatusMap = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  EXECUTING: "executing",
  ABORTING: "aborting",
  CANCELED: "canceled",
  COMPLETED: "completed",
} as const;

const schema = () =>
  object({
    missions: array(
      object({
        amrId: string().optional().nullable(),
        missionId: string().required(),
        sub_name: string().required(),
        full_name: array(string().optional()).required().nullable(),
        category: array(string().optional()).required(),
        missionType: mixed<keyof typeof missionTypeMap>()
          .oneOf(objectKeys(missionTypeMap))
          .required(),
        missionStatus: mixed<keyof typeof missionStatusMap>()
          .oneOf(objectKeys(missionStatusMap))
          .required(),
        manualMode: boolean().required(),
        emergencyBtn: boolean().required(),
        recoveryBtn: boolean().optional(),
        warningIdList: array(number().optional()).optional(),
        createdAt: date().required(),
        assignedAt: date().optional(),
        startedAt: date().optional(),
        completedAt: date().optional(),
        info: string().optional().nullable(),
        cancelReason: number().optional().nullable(),
        status: number().required(),
        order: number().required(),
        priority: number().required(),
      }).required()
    ).required(),
  }).required();

const missionReports$ = fromEventPattern(
  (next) => {
    io.on("mission", next);
    return next;
  },
  (next) => {
    io.off("mission", next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("mission socket schema mismatch: ", err.value);
          return undefined;
        })
    )
  ),
  filter(isDefined),
  map((e) => {
    const missions = e.missions.map((m) => ({
      ...m,
      key: m.missionId,
      missionType: missionTypeMap[m.missionType],
      missionStatus: missionStatusMap[m.missionStatus],
    }));

    return {
      ...e,
      missions,
    };
  }),
  share()
);

export const useMissions = () => {
  const [missions, setMissions] = useState<
    InferObservableType<typeof missionReports$>["missions"]
  >([]);
  useEffect(() => {
    const sub = missionReports$
      .pipe(
        pluck("missions"),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        )
      )
      .subscribe((ms) => {
        setMissions(ms);
      });

    return () => {
      sub.unsubscribe();
    };
  }, []);
  return { missions };
};

export const useMissionsOnce = () => {
  const [missions, setMissions] = useState<
    InferObservableType<typeof missionReports$>["missions"]
  >([]);
  useEffect(() => {
    const sub = missionReports$.pipe(pluck("missions")).subscribe((ms) => {
      setMissions(ms);
      sub.unsubscribe();
    });
  }, []);
  return { missions };
};

export const useRecentMission = (amrId: string) => {
  const [recentMission, setRecentMission] = useState<MissionInfo | undefined>(
    undefined
  );

  useEffect(() => {
    const sub = missionReports$
      .pipe(
        pluck("missions"),
        filter(Array.isArray),
        map(
          (missions: MissionInfo[]) =>
            missions
              .filter((m) => m.amrId === amrId)
              .sort(
                (a, b) =>
                  (b.startedAt?.getTime?.() || 0) -
                  (a.startedAt?.getTime?.() || 0)
              )[0]
        ),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(setRecentMission);

    return () => sub.unsubscribe();
  }, [amrId]);

  return { recentMission };
};

export type MissionInfo = {
  amrId?: string;
  missionId: string;
  full_name: string[];
  sub_name: string;
  category: string[];
  missionType: string;
  missionStatus: string;
  manualMode?: boolean | string;
  emergencyBtn?: boolean | string;
  recoveryBtn?: boolean | string;
  warningIdList?: Array<undefined | number>;
  createdAt?: Date;
  assignedAt?: Date;
  startedAt?: Date;
  forkStartAt?: Date;
  forkEndAt?: Date;
  completedAt?: Date;
  info?: string | null;
  cancelReason?: CancelReason;
  priority?: number;
  order: number;
};

export type Additional_Mission_Info = {
  missionFullName?: string[];
  loadLocationId?: string;
  offloadLocationId?: string;
  forkStartAt?: Date;
  forkEndAt?: Date;
};

export const useMission = (missionId: string) => {
  const { missions } = useMissions();
  return missions.find((m) => m.missionId === missionId);
};
