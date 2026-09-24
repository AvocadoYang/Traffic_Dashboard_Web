import { array, string, object, ValidationError, number, boolean } from "yup";
import {
  from,
  fromEventPattern,
  shareReplay,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";
import { Elevator_Info } from "@/types/peripheral";
import { deepEqual } from "@/utils/deepEqual";

const profiles$ = fromEventPattern(
  (next) => {
    io.on("elevator-info", next);
    return next;
  },
  (next) => {
    io.off("elevator-info", next);
  },
).pipe(
  switchMap((msg: unknown) => {
    if (typeof msg !== "object" || msg === null) {
      console.error("Invalid message format.");
      return from([undefined]);
    }

    const message = msg as { [key: string]: Elevator_Info };

    if (message === null) {
      return from([undefined]);
    }

    return from([message]);
  }),
  distinctUntilChanged(
    (prev, curr) => deepEqual(prev, curr),
  ),
  // 資料沒變時 distinctUntilChanged 不會再發,晚訂閱的元件(例如貨物面板)
  // 會一直拿不到資料,所以要 replay 最新一筆
  shareReplay({ bufferSize: 1, refCount: true }),
);
const useElevatorSocket = () => {
  const [cargoInfo, setCargoInfo] = useState<{
    [key: string]: Elevator_Info;
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

export default useElevatorSocket;
