import { useCallback, useEffect, useRef } from "react";
import { Subject } from "rxjs";
import { throttleTime } from "rxjs/operators";
import { io } from "@/sockets/socketConnect";
import type { JoystickValue } from "../pages/Main/Car_Card/components/Joystick";

const JOYSTICK_CONTROL = "joystick-control" as const;
const THROTTLE_MS = 100;

const generateWebSessionId = () => `${Date.now()}-${Math.random() * 100}`;

export const useJoystickControl = (amrId: string) => {
  const move$ = useRef(new Subject<JoystickValue>()).current;

  const webSessionIdRef = useRef<string>();
  if (!webSessionIdRef.current)
    webSessionIdRef.current = generateWebSessionId();

  const send = useCallback(
    (value: JoystickValue) => {
      io.emit(JOYSTICK_CONTROL, {
        amrId,
        web_session_id: webSessionIdRef.current,
        ...value,
      });
    },
    [amrId],
  );

  useEffect(() => {
    const subscription = move$
      .pipe(
        throttleTime(THROTTLE_MS, undefined, { leading: true, trailing: true }),
      )
      .subscribe(send);

    return () => {
      subscription.unsubscribe();
      send({ x: 0, y: 0 });
    };
  }, [move$, send]);

  const onMove = useCallback(
    (value: JoystickValue) => move$.next(value),
    [move$],
  );

  // 放開搖桿：不經節流，立即送出歸零值，確保車輛馬上停止。
  const onEnd = useCallback(() => send({ x: 0, y: 0 }), [send]);

  return { onMove, onEnd, webSessionId: webSessionIdRef.current };
};
