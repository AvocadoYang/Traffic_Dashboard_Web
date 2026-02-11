import { distinctUntilChanged, filter, fromEventPattern, share } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { useEffect, useState } from "react";

export type File_Mission = {
  agv_id: string;
  start_time: string;
  priority: number;
  start_node: string;
  end_node: string;
};

const remainScheduleMission$ = fromEventPattern(
  (next) => {
    io.on("remain-schedule", next);
    return next;
  },
  (next) => {
    io.off("remain-schedule", next);
  },
).pipe(filter(isDefined), share());

export const useRemainSchedule = () => {
  const [s, setS] = useState<File_Mission[]>([]);
  useEffect(() => {
    const sub = remainScheduleMission$
      // .pipe(
      //   distinctUntilChanged(
      //     (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
      //   ),
      // )
      .subscribe((info) => {
        setS(info.schedule as File_Mission[]);
      });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};
