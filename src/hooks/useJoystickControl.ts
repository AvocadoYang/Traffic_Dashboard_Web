import { useCallback, useEffect, useRef } from "react";
import { Subject } from "rxjs";
import { throttleTime } from "rxjs/operators";
import { io } from "@/sockets/socketConnect";
import type { JoystickValue } from "../pages/Main/Car_Card/components/Joystick";

/** 後端 socket.io 監聽搖桿指令的事件名稱（依後端實際名稱調整）。 */
const JOYSTICK_EMIT_EVENT = "set-joystick-vel";
/** ROS Bridge 要發布的 topic 名稱。 */
const JOYSTICK_TOPIC = "/joystick_vel";
/** 最大線速度（前後），單位 m/s，依實車調整。 */
const MAX_LINEAR = 0.4;
/** 最大角速度（轉向），單位 rad/s，依實車調整。 */
const MAX_ANGULAR = 0.8;
/** 拖曳中發送的節流間隔（毫秒）。 */
const THROTTLE_MS = 100;

/** 把搖桿座標（-100~100）換算成後端要的 ROS Twist 發布封包。 */
const toPublishPayload = (value: JoystickValue, seq: number) => ({
  op: "publish",
  id: `publish:${JOYSTICK_TOPIC}:${seq}`,
  topic: JOYSTICK_TOPIC,
  msg: {
    joystick_token: "",
    speed_command: {
      // linear.x：前後速度。搖桿上推（y 正）為前進。
      linear: { x: (value.y / 100) * MAX_LINEAR, y: 0, z: 0 },
      // angular.z：轉向角速度。ROS 慣例正值＝左轉（逆時針），
      // 搖桿右推（x 正）＝右轉，故取負號；若方向相反把負號拿掉即可。
      angular: { x: 0, y: 0, z: -(value.x / 100) * MAX_ANGULAR },
    },
  },
  latch: false,
});

/**
 * 管理單一車輛的搖桿控制：節流、格式轉換、透過 socket.io 送出。
 * 回傳可直接掛到 <Joystick> 的 onMove / onEnd。
 */
export const useJoystickControl = (amrId: string) => {
  // 搖桿移動事件的來源 stream，整個生命週期共用同一個 Subject。
  const move$ = useRef(new Subject<JoystickValue>()).current;
  // 每次發布遞增的序號，用來組出 rosbridge 的 id（publish:<topic>:<seq>）。
  const publishSeq = useRef(0);

  // 換算格式並帶上車輛 id 送出，讓後端知道要路由到哪一台。
  const send = useCallback(
    (value: JoystickValue) => {
      const payload = toPublishPayload(value, (publishSeq.current += 1));
      io.emit(JOYSTICK_EMIT_EVENT, { amrId, payload });
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
