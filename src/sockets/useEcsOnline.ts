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
  isAlive: boolean().required(),
}).optional();

const profiles$ = fromEventPattern(
  (next) => {
    io.on("ecs-alive", next);
    return next;
  },
  (next) => {
    io.off("ecs-alive", next);
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
const useEcsAlive = () => {
  const [ecsAlive, setEcsAlive] = useState<boolean>();

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        )
      )
      .subscribe((filteredData) => {
        setEcsAlive(filteredData?.isAlive);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return ecsAlive;
};

export default useEcsAlive;
