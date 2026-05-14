import { filter, from, fromEventPattern, share, switchMap, tap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import {  array, boolean, object, string, ValidationError } from "yup";
import { useEffect, useState } from "react";


export interface UserConformData {
  amrId: string;
  inner?: {
    fullName: string;
    subName: string;
    message: string;
  };
}
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
  // 1. 修改 State 型別：從 string[] 改為 UserConformData[]
  const [pendingTasks, setPendingTasks] = useState<UserConformData[]>([]);

  useEffect(() => {
    // 初始列表
    const hInit = (list: UserConformData[]) => setPendingTasks(list);
    io.on("init-user-conform-next-step-list", hInit);

    // 新增告警
    const hAdd = (data: UserConformData) => {
      setPendingTasks((prev) => {
        // 檢查是否已存在，避免重複加入
        const exists = prev.some((item) => item.amrId === data.amrId);
        if (exists) return prev;
        return [...prev, data];
      });
    };
    io.on("user-conform-next-step", hAdd);

    // 移除告警
    const hRemove = (data: { amrId: string }) => {
      setPendingTasks((prev) =>
        prev.filter((item) => item.amrId !== data.amrId),
      );
    };
    io.on("remove-user-conform-step", hRemove);

    return () => {
      io.off("init-user-conform-next-step-list", hInit);
      io.off("user-conform-next-step", hAdd);
      io.off("remove-user-conform-step", hRemove);
    };
  }, []);

  return pendingTasks;
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