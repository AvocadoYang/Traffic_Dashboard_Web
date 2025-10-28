import {
  distinctUntilChanged,
  filter,
  from,
  fromEventPattern,
  share,
  switchMap,
} from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { boolean, object, ValidationError } from "yup";
import { useEffect, useState } from "react";

const schema = () =>
  object({
    isRightSideIdle: boolean().required(),
    isLeftSideIdle: boolean().required(),
    isRightSideAuto: boolean().required(),
    isLeftSideAuto: boolean().required(),
    isOutputAuto: boolean().required(),
    isRightSideEmpty: boolean().required(),
    isLeftSideEmpty: boolean().required(),
    isOutputEmpty: boolean().required(),
  });

const elevator$ = fromEventPattern(
  (next) => {
    io.on("elevator-signal", next);
    return next;
  },
  (next) => {
    io.off("elevator-signal", next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("elevator socket schema mismatch: ", err.value);
          return undefined;
        })
    )
  ),
  filter(isDefined),
  share()
);

export const useElevatorSignal = () => {
  const [elevator, setElevator] = useState<{
    isRightSideIdle: boolean;
    isLeftSideIdle: boolean;
    isRightSideAuto: boolean;
    isLeftSideAuto: boolean;
    isOutputAuto: boolean;
    isRightSideEmpty: boolean;
    isLeftSideEmpty: boolean;
    isOutputEmpty: boolean;
  }>();
  useEffect(() => {
    const sub = elevator$.pipe(distinctUntilChanged()).subscribe((infos) => {
      setElevator(infos);
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return elevator;
};
