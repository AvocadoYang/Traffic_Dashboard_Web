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

const schema =  string().required()

const getC$ = fromEventPattern(
  (next) => {
    io.on("ecs-transaction-request", next);
    return next;
  },
  (next) => {
    io.off("ecs-transaction-request", next);
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


export const useEcsTransaction = () => {
  const [data, setData] = useState<string>('');

  useEffect(() => {
    const scriptStatus = getC$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
      )
      .subscribe((data) => {
        setData(data);
      });

    return () => {
      scriptStatus.unsubscribe();
    };
  }, []);

  return data;
};
