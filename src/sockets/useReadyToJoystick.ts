import {
  fromEventPattern,
  from,
  filter,
  share,
  concatMap,
  distinctUntilChanged,
} from "rxjs";
import { boolean, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";
import { isDefined } from "ts-extras";
import { io } from "./socketConnect";

export type ReadyToJoystick = {
  amrId: string;
  joystick_available: boolean;
  status_text?: string;
};

const schema = object({
  amrId: string().required(),
  joystick_available: boolean().required(),
  status_text: string().optional(),
});

const isSameStatus = (a: ReadyToJoystick, b: ReadyToJoystick) =>
  a.joystick_available === b.joystick_available &&
  a.status_text === b.status_text;

const readyToJoystick$ = fromEventPattern(
  (next) => {
    io.on("ready-to-joystick", next);
    return next;
  },
  (next) => {
    io.off("ready-to-joystick", next);
  },
).pipe(
  concatMap((msg) =>
    from(
      schema
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("ready-to-joystick socket schema mismatch: ", err.value);
          return undefined;
        }),
    ),
  ),
  filter(isDefined),
  share(),
);

export const useReadyToJoystick = (amrId: string) => {
  const [status, setStatus] = useState<ReadyToJoystick>();

  useEffect(() => {
    setStatus(undefined);

    const subscription = readyToJoystick$
      .pipe(
        filter((info) => info.amrId === amrId),
        distinctUntilChanged(isSameStatus),
      )
      .subscribe(setStatus);

    return () => {
      subscription.unsubscribe();
    };
  }, [amrId]);

  return status;
};

export default useReadyToJoystick;
