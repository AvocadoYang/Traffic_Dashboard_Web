import { useCallback, useEffect, useRef } from "react";
import { Subject } from "rxjs";
import { throttleTime } from "rxjs/operators";
import { amrIo } from "@/sockets/socketConnect";
import type { JoystickValue } from "../pages/Main/Car_Card/components/Joystick";

/** 後端 socket.io 監聽搖桿指令的事件名稱 */
const JOYSTICK_CONTROL = "joystick-control" as const;
/** 拖曳中發送的節流間隔（毫秒）。 */
const THROTTLE_MS = 100;

/**
 * 管理單一車輛的搖桿控制：節流後透過 socket.io 送出原始搖桿座標。
 * 回傳可直接掛到 <Joystick> 的 onMove / onEnd。
 */
export const useJoystickControl = (amrId: string) => {
  // 搖桿移動事件的來源 stream，整個生命週期共用同一個 Subject。
  const move$ = useRef(new Subject<JoystickValue>()).current;

  // 帶上車輛 id 送出原始座標，讓後端知道要路由到哪一台。
  const send = useCallback(
    (value: JoystickValue) => {
      amrIo.emit(JOYSTICK_CONTROL, { amrId, ...value });
    },
    [amrId]
  );

  // 拖曳中：透過 throttleTime 限制成每 THROTTLE_MS 最多送一次。
  useEffect(() => {
    const subscription = move$
      .pipe(throttleTime(THROTTLE_MS, undefined, { leading: true, trailing: true }))
      .subscribe(send);

    return () => subscription.unsubscribe();
  }, [move$, send]);

  const onMove = useCallback(
    (value: JoystickValue) => move$.next(value),
    [move$]
  );

  // 放開搖桿：不經節流，立即送出歸零值，確保車輛馬上停止。
  const onEnd = useCallback(() => send({ x: 0, y: 0 }), [send]);

  return { onMove, onEnd };
};
