import { distinctUntilChanged, filter, fromEventPattern, share } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { useEffect, useState } from "react";

const remainScheduleMission$ = fromEventPattern(
  (next) => {
    io.on("schedule-status", next);
    return next;
  },
  (next) => {
    io.off("schedule-status", next);
  },
).pipe(filter(isDefined), share());

export const useScheduleStatus = () => {
  const [s, setS] = useState<{ status: "1" | "0" }>({ status: "0" });
  useEffect(() => {
    const sub = remainScheduleMission$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
      )
      .subscribe((info) => {
        setS(info as { status: "1" | "0" });
      });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};
