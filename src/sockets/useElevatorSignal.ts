import {
  distinctUntilChanged,
  filter,
  from,
  fromEventPattern,
  map,
  share,
  switchMap,
} from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { boolean, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";

// --- Schema definition ---
const schema = () =>
  object({
    right: object({
      isMLMI01Idle: boolean().optional().nullable(),
      isMLFI01Idle: boolean().optional().nullable(),
      isMLMI01Auto: boolean().optional().nullable(),
      isMLFI01Auto: boolean().optional().nullable(),
      isMLO01Auto: boolean().optional().nullable(),
      isMLMI01Empty: boolean().optional().nullable(),
      isMLFI01Empty: boolean().optional().nullable(),
      isMLO01Empty: boolean().optional().nullable(),
    }).nullable(),
    left: object({
      isMLMI02Idle: boolean().optional().nullable(),
      isMLFI02Idle: boolean().optional().nullable(),
      isMLMI02Auto: boolean().optional().nullable(),
      isMLFI02Auto: boolean().optional().nullable(),
      isMLMI02Empty: boolean().optional().nullable(),
      isMLFI02Empty: boolean().optional().nullable(),
    }).nullable(),
    side: string().required(), // "left" | "right"
  });

// --- Shared observable for all elevator events ---
const elevator$ = fromEventPattern(
  (next) => {
    io.on("elevator-signal", next);
    return next;
  },
  (next) => {
    io.off("elevator-signal", next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("elevator socket schema mismatch: ", err.value);
          return undefined;
        })
    )
  ),
  filter(isDefined),
  share()
);

// --- Type definitions ---
export type Right_Side_Elevator = {
  isMLMI01Idle?: boolean | null;
  isMLFI01Idle?: boolean | null;
  isMLMI01Auto?: boolean | null;
  isMLFI01Auto?: boolean | null;
  isMLO01Auto?: boolean | null;
  isMLMI01Empty?: boolean | null;
  isMLFI01Empty?: boolean | null;
  isMLO01Empty?: boolean | null;
};

export type Left_Side_Elevator = {
  isMLMI02Idle?: boolean | null;
  isMLFI02Idle?: boolean | null;
  isMLMI02Auto?: boolean | null;
  isMLFI02Auto?: boolean | null;
  isMLMI02Empty?: boolean | null;
  isMLFI02Empty?: boolean | null;
};

// --- Separated hooks ---
export const useRightElevatorSignal = () => {
  const [elevator, setElevator] = useState<Right_Side_Elevator | null>(null);

  useEffect(() => {
    const sub = elevator$
      .pipe(
        filter((msg) => msg.side === "right" && !!msg.right),
        map((msg) => msg.right),
        distinctUntilChanged()
      )
      .subscribe((right) => {
        setElevator(right);
      });

    return () => sub.unsubscribe();
  }, []);

  return elevator;
};

export const useLeftElevatorSignal = () => {
  const [elevator, setElevator] = useState<Left_Side_Elevator | null>(null);

  useEffect(() => {
    const sub = elevator$
      .pipe(
        filter((msg) => msg.side === "left" && !!msg.left),
        map((msg) => msg.left),
        distinctUntilChanged()
      )
      .subscribe((left) => {
        setElevator(left);
      });

    return () => sub.unsubscribe();
  }, []);

  return elevator;
};
