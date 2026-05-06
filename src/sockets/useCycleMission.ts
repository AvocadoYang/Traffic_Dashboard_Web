import {
  distinctUntilChanged,
  filter,
  from,
  fromEventPattern,
  share,
  switchMap,
} from "rxjs";
import { isDefined } from "ts-extras";
import { io } from "./socketConnect";
import { useState, useEffect } from "react";
import {
  object,
  ValidationError,
  boolean,
  array,
  string,
  InferType,
} from "yup";
import { MissionPriority } from "@/types/mission";

export type Cycle_Mission = {
  amrId: string;
  priority: MissionPriority;
  missionType: "normal" | "dynamic" | "direct";
  missionId: string | null;
  eptS: string | null;
  eptD: string | null;
  dirEpt: string | null;
  dirEptControl: string | null;
};

export type Cycle = {
  Id: string;
  Name: string;
  IsActive: boolean;
  Idx: number;
  Payload: Cycle_Mission[];
};

const getC$ = fromEventPattern(
  (next) => {
    io.on("cycle-mission", next);
    return next;
  },
  (next) => {
    io.off("cycle-mission", next);
  }
).pipe(share());

export const useCycleMission = () => {
  const [cycleData, setCycleData] = useState<Cycle[]>([]);

  useEffect(() => {
    const scriptStatus = getC$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        )
      )
      .subscribe((data) => {
        setCycleData(data as Cycle[]);
      });

    return () => {
      scriptStatus.unsubscribe();
    };
  }, []);

  return cycleData;
};
