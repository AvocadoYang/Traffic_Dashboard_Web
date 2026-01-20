import { array, string, object, ValidationError, number, boolean } from "yup";
import {
  from,
  fromEventPattern,
  share,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";
import { Conveyor_Info } from "@/types/peripheral";

const strSchema = string().optional().nullable();

const relationshipSchema = object().test(
  "relation-type",
  "relationship has format error",
  (value) => {
    if (!value || Object.keys(value).length === 0) return true;

    if (typeof value !== "object" || Array.isArray(value)) return false;

    for (const key in value) {
      const levelValue = value[key];
      const valid = strSchema.isValidSync(levelValue);
      if (!valid) return false;
    }

    return true;
  },
);

const profiles$ = fromEventPattern(
  (next) => {
    io.on("conveyor-info", next);
    return next;
  },
  (next) => {
    io.off("conveyor-info", next);
  },
).pipe(
  switchMap((msg: unknown) => {
    if (typeof msg !== "object" || msg === null) {
      console.error("Invalid message format.");
      return from([undefined]);
    }

    const message = msg as { [key: string]: Conveyor_Info };

    if (message === null) {
      return from([undefined]);
    }

    return from([message]);
  }),
  distinctUntilChanged(
    (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
  ),
  share(),
);

const useConveyorSocket = () => {
  const [cargoInfo, setCargoInfo] = useState<{
    [key: string]: Conveyor_Info;
  }>();

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ), // Avoid state update if data is identical
      )
      .subscribe((filteredData) => {
        if (filteredData) {
          setCargoInfo(filteredData);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return cargoInfo;
};

export default useConveyorSocket;
