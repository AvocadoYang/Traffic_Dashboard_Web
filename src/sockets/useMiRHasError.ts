import { array, string, object, ValidationError, number, boolean } from "yup";
import {
  from,
  fromEventPattern,
  share,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";
import { Elevator_Info } from "@/types/peripheral";

const schema = object({
  amrId: string().required(),
  hasError: boolean().required()
}).optional();

const profiles$ = fromEventPattern(
  (next) => {
    io.on("hasError", next);
    return next;
  },
  (next) => {
    io.off("hasError", next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("script mismatch: ", err.value);
          return undefined;
        })
    )
  ),
  distinctUntilChanged(
    (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
  ),
  share()
);
const useMiRHasError = () => {
  const [hasError, setHasError] = useState<boolean>();

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        )
      )
      .subscribe((data) => {
        setHasError(data?.hasError)
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return hasError;
};

export default useMiRHasError;
