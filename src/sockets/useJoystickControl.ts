import { useCallback, useEffect, useRef } from "react";
import { io } from "@/sockets/socketConnect";
import type { JoystickValue } from "../pages/Main/Car_Card/components/Joystick";

const JOYSTICK_CONTROL = "joystick-control" as const;
const SEND_INTERVAL_MS = 100;

const generateWebSessionId = () => `${Date.now()}-${Math.random() * 100}`;

const CENTER: JoystickValue = { x: 0, y: 0 };

export const useJoystickControl = (amrId: string) => {
  const webSessionIdRef = useRef<string>();
  if (!webSessionIdRef.current)
    webSessionIdRef.current = generateWebSessionId();

  const latestRef = useRef<JoystickValue>(CENTER);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

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

  const stopHeartbeat = useCallback(() => {
    if (timerRef.current === undefined) return;
    clearInterval(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const onMove = useCallback(
    (value: JoystickValue) => {
      latestRef.current = value;
      if (timerRef.current !== undefined) return;

      send(value);
      timerRef.current = setInterval(
        () => send(latestRef.current),
        SEND_INTERVAL_MS,
      );
    },
    [send],
  );

  const onEnd = useCallback(() => {
    stopHeartbeat();
    latestRef.current = CENTER;
    send(CENTER);
  }, [send, stopHeartbeat]);

  useEffect(() => {
    return () => {
      stopHeartbeat();
      latestRef.current = CENTER;
      send(CENTER);
    };
  }, [send, stopHeartbeat]);

  return { onMove, onEnd, webSessionId: webSessionIdRef.current };
};
