import {
  from,
  fromEventPattern,
  share,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";

const profiles$ = fromEventPattern(
  (next) => {
    io.on("yfy-auto-mission", next);
    return next;
  },
  (next) => {
    io.off("yfy-auto-mission", next);
  },
).pipe(
  switchMap((msg: unknown) => {
    if (typeof msg !== "object" || msg === null) {
      console.error("Invalid message format.");
      return from([undefined]);
    }

    const message = msg as {
      arm_to_temp: boolean;
      arm_to_pk1: boolean;
      temp_to_dock: boolean;
      otry_to_itry3: boolean;
      pk12_to_ot1: boolean;
    };

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
const useYfyAutoMission = () => {
  const [cargoInfo, setCargoInfo] = useState<{
    arm_to_temp: boolean;
    arm_to_pk1: boolean;
    temp_to_dock: boolean;
    otry_to_itry3: boolean;
    pk12_to_ot1: boolean;
  }>({
    arm_to_temp: false,
    arm_to_pk1: false,
    temp_to_dock: false,
    otry_to_itry3: false,
    pk12_to_ot1: false,
  });

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
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

export default useYfyAutoMission;
