import { filter, from, fromEventPattern, share, switchMap, tap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { array, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";

const schema = () =>
  object({
    amrId: string().required(),
    state: string().required(),
  });

const state$ = fromEventPattern(
  (next) => {
    io.on("state", next);
    return next;
  },
  (next) => {
    io.off("state", next);
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

export const useSystemState = (amrId: string) => {
  const [s, setS] = useState<{ amrId: string; state: string }>();
  useEffect(() => {
    const sub = state$
      .pipe(filter((e) => e.amrId === amrId))
      .subscribe((infos) => {
        setS(infos);
      });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};
