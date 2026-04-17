import { filter, from, fromEventPattern, share, switchMap, tap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { array, number, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";

export type SystemAlarmData = {
  level: number;
  message: string;
  tstamp?: Date;
};

const schema = () =>
  object({
    level: number().required(),
    message: string().required(),
  });

const warningId$ = fromEventPattern(
  (next) => {
    io.on("report-system-alarm", next);
    return next;
  },
  (next) => {
    io.off("report-system-alarm", next);
  },
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error(
            "claimed-resources socket schema mismatch: ",
            err.value,
          );
          return undefined;
        }),
    ),
  ),
  filter(isDefined),
  share(),
);

export const useSystemAlarm = () => {
  const [warningList, setWarningList] = useState<SystemAlarmData>({
    message: "",
    level: 0,
  });
  useEffect(() => {
    const sub = warningId$.subscribe((infos) => {
      setWarningList(infos);
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return warningList;
};
