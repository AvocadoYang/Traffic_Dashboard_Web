import {
  fromEventPattern,
  from,
  filter,
  share,
  concatMap,
  distinctUntilChanged,
  tap,
} from "rxjs";
import { boolean, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";
import { isDefined } from "ts-extras";
import { io } from "./socketConnect";

export type ReadyToJoystick = {
  amrId: string;
  joystick_available: boolean;
  status_text?: string;
  unavailable_reason?: string | null;
  /** 目前握有這台車搖桿控制權的 web session；沒人佔用時為空。 */
  joystick_owner_session_id?: string | null;
};

const schema = object({
  amrId: string().required(),
  joystick_available: boolean().required(),
  status_text: string().optional(),
  unavailable_reason: string().nullable().optional(),
  joystick_owner_session_id: string().nullable().optional(),
});

const isSameStatus = (a: ReadyToJoystick, b: ReadyToJoystick) =>
  a.joystick_available === b.joystick_available &&
  a.status_text === b.status_text &&
  a.unavailable_reason === b.unavailable_reason &&
  a.joystick_owner_session_id === b.joystick_owner_session_id;

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
