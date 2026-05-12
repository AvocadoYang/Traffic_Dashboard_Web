import { filter, from, fromEventPattern, share, switchMap, tap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import {  array, boolean, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";



const schema = () =>
    object({
      amrId: string().required(),
    })
  

const userConformStep$ = fromEventPattern(
  (next) => {
    io.on("user-conform-next-step", next);
    return next;
  },
  (next) => {
    io.off("user-conform-next-step", next);
  },
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error(
            "claimed-resources socket schema mismatch: ",
            err.value,
          );
          return undefined;
        }),
    ),
  ),
  filter(isDefined),
  share(),
);

// useConformHooks.ts

export const useUserConformTaskStep = () => {
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    // 監聽：新增告警
    const subAdd = fromEventPattern(
      (h) => io.on("user-conform-next-step", h),
      (h) => io.off("user-conform-next-step", h),
    ).subscribe((data: any) => {
      setPendingIds((prev) => Array.from(new Set([...prev, data.amrId])));
    });

    // 監聽：移除告警 (當別人確認後)
    const subRemove = fromEventPattern(
      (h) => io.on("remove-user-conform-step", h),
      (h) => io.off("remove-user-conform-step", h),
    ).subscribe((data: any) => {
      setPendingIds((prev) => prev.filter((id) => id !== data.amrId));
    });

    // 初始列表
    const subInit = fromEventPattern(
      (h) => io.on("init-user-conform-next-step-list", h),
      (h) => io.off("init-user-conform-next-step-list", h),
    ).subscribe((list: string[]) => {
      setPendingIds(list);
    });

    return () => {
      subAdd.unsubscribe();
      subRemove.unsubscribe();
      subInit.unsubscribe();
    };
  }, []);

  return pendingIds;
};

export const useConformManager = () => {
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    // 1. 初始列表
    const hInit = (list: string[]) => setPendingIds(list);
    io.on("init-user-conform-next-step-list", hInit);

    // 2. 新增告警
    const hAdd = (data: { amrId: string }) => {
      setPendingIds((prev) => Array.from(new Set([...prev, data.amrId])));
    };
    io.on("user-conform-next-step", hAdd);

    // 3. 移除告警 (同步關鍵)
    const hRemove = (data: { amrId: string }) => {
      console.log("收到移除指令:", data.amrId); // 先確認 Console 有印出這行
      setPendingIds((prev) => prev.filter((id) => id !== data.amrId));
    };
    io.on("remove-user-conform-step", hRemove);

    return () => {
      io.off("init-user-conform-next-step-list", hInit);
      io.off("user-conform-next-step", hAdd);
      io.off("remove-user-conform-step", hRemove);
    };
  }, []);

  return pendingIds;
};


const initSchema = () =>
      array(
        string().optional()
    ).optional()


 export const initUserConformStep$ = fromEventPattern(
  (next) => {
    io.on("init-user-conform-next-step-list", next);
    return next;
  },
  (next) => {
    io.off("init-user-conform-next-step-list", next);
  },
).pipe(
  switchMap((msg) =>
    from(
      initSchema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error(
            "claimed-resources socket schema mismatch: ",
            err.value,
          );
          return undefined;
        }),
    ),
  ),
  filter(isDefined),
  share(),
);


export const useInitUserConformTaskStep = () => {
  const [ucts, setUcts] = useState<string[]>([]);
  useEffect(() => {
    const sub = initUserConformStep$.subscribe((infos) => {
      setUcts(infos as []);
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return ucts;
};

export enum Peripheral_Task_Request {
  NULL = 'NULL',
  USER_CONFORM_NEXT_TASK_STEP = 'USER_CONFORM_NEXT_TASK_STEP',
  OPEN_ROLLING_DOOR = 'OPEN_ROLLING_DOOR',
  CLOSE_ROLLING_DOOR = 'CLOSE_ROLLING_DOOR',
  READ_ROLLING_DOOR_OPEN = 'READ_ROLLING_DOOR_OPEN',
  READ_ROLLING_DOOR_CLOSE = 'READ_ROLLING_DOOR_CLOSE',
}