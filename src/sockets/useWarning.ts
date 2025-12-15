import { filter, from, fromEventPattern, share, switchMap, tap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { array, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";

type WarningData = {
  warningId: string;
  info: string;
  debug?: string;
};

const schema = () =>
  array(
    object({
      amrId: string().required(),
      message: array(
        object({
          warningId: string().required(),
          info: string().required(),
          debug: string(),
        }),
      ).required(),
    }),
  );

const warningId$ = fromEventPattern(
  (next) => {
    io.on("car-error-info", next);
    return next;
  },
  (next) => {
    io.off("car-error-info", next);
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

export const useWarningId = () => {
  const [warningList, setWarningList] = useState<Map<string, WarningData[]>>();
  useEffect(() => {
    const sub = warningId$.subscribe((infos) => {
      if (!infos.length) return;

      const errorMap = new Map<string, WarningData[]>();
      infos.forEach((info) => {
        errorMap.set(info.amrId, info.message);
      });
      setWarningList(errorMap);
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return warningList;
};
