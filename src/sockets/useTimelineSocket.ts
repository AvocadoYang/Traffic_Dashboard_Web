import { filter, from, fromEventPattern, share, switchMap } from "rxjs";
import { isDefined } from "ts-extras";
import { io } from "./socketConnect";
import { useState, useEffect } from "react";
import { ValidationError, string } from "yup";

const schema = string().required();

const getC$ = fromEventPattern(
  (next) => {
    io.on("timeline", next);
    return next;
  },
  (next) => {
    io.off("timeline", next);
  },
).pipe(
  switchMap((msg) =>
    from(
      schema
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("script mismatch: ", err.value);
          return undefined;
        }),
    ),
  ),
  filter(isDefined),
  share(),
);

export const useTimelineSocket = () => {
  const [data, setData] = useState<string>("00:00:00");

  useEffect(() => {
    const scriptStatus = getC$.subscribe((data) => {
      setData(data);
    });

    return () => {
      scriptStatus.unsubscribe();
    };
  }, []);

  return data;
};
