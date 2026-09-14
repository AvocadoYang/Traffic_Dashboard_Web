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
import { Lift_Gate_Info, Stack_Info } from "@/types/peripheral";
import { deepEqual } from "@/utils/deepEqual";

const profiles$ = fromEventPattern(
  (next) => {
    io.on("stack-info", next);
    return next;
  },
  (next) => {
    io.off("stack-info", next);
  },
).pipe(
  switchMap((msg: unknown) => {
    if (typeof msg !== "object" || msg === null) {
      console.error("Invalid message format.");
      return from([undefined]);
    }

    const message = msg as { [key: string]: Stack_Info };

    if (message === null) {
      return from([undefined]);
    }

    return from([message]);
  }),
  distinctUntilChanged(
    (prev, curr) => deepEqual(prev, curr),
  ),
  share(),
);
const useStackSocket = () => {
  const [cargoInfo, setCargoInfo] = useState<{
    [key: string]: Stack_Info;
  }>();

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => deepEqual(prev, curr),
        ),
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

export default useStackSocket;
