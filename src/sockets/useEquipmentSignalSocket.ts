import { fromEventPattern, shareReplay, distinctUntilChanged } from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";
import { deepEqual } from "@/utils/deepEqual";

export type EquipmentSignalModules = {
  [module: string]: { states: boolean[]; updatedAt: number; alive: boolean };
};

const signals$ = fromEventPattern<EquipmentSignalModules>(
  (next) => {
    io.on("equipment-signal", next);
    return next;
  },
  (next) => {
    io.off("equipment-signal", next);
  },
).pipe(
  // updatedAt 每秒都在變,比的時候只看值和有沒有斷線
  distinctUntilChanged((prev, curr) =>
    deepEqual(
      Object.entries(prev ?? {}).map(([k, v]) => [k, v.states, v.alive]),
      Object.entries(curr ?? {}).map(([k, v]) => [k, v.states, v.alive]),
    ),
  ),
  shareReplay({ bufferSize: 1, refCount: true }),
);

/** 設備訊號(遠端 IO 模組)的即時值。從來沒有訊號進來時是空物件 */
const useEquipmentSignalSocket = () => {
  const [modules, setModules] = useState<EquipmentSignalModules>({});

  useEffect(() => {
    const subscription = signals$.subscribe((data) => {
      if (data && typeof data === "object") setModules(data);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return modules;
};

export default useEquipmentSignalSocket;
