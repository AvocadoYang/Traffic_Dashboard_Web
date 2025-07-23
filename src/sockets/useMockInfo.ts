import {
  distinctUntilChanged,
  filter,
  from,
  fromEventPattern,
  share,
  switchMap,
} from "rxjs";
import { isDefined } from "ts-extras";
import { io } from "./socketConnect";
import { useState, useEffect } from "react";
import {
  object,
  ValidationError,
  boolean,
  array,
  string,
  InferType,
  number,
} from "yup";

const schema = object({
  robot: array(
    object({
      id: string().required(),
      serialNum: string().required(),
      script_placement_location: string().required(),
    }),
  ).optional(),
  isSimulate: boolean().required(),
  scriptName: string().required(),
  duration: number().required(),
  result: string().required(),
}).optional();

const getC$ = fromEventPattern(
  (next) => {
    io.on("mock-info", next);
    return next;
  },
  (next) => {
    io.off("mock-info", next);
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

export type Mock_Info = InferType<typeof schema>;

export const useMockInfo = () => {
  const [cycleData, setCycleData] = useState<Mock_Info>();

  useEffect(() => {
    const scriptStatus = getC$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
      )
      .subscribe((data) => {
        setCycleData(data);
      });

    return () => {
      scriptStatus.unsubscribe();
    };
  }, []);

  return cycleData;
};
