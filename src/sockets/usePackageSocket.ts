import {
  from,
  fromEventPattern,
  shareReplay,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";
import { Package_Info } from "@/types/peripheral";
import { deepEqual } from "@/utils/deepEqual";

const profiles$ = fromEventPattern(
  (next) => {
    io.on("package-info", next);
    return next;
  },
  (next) => {
    io.off("package-info", next);
  },
).pipe(
  switchMap((msg: unknown) => {
    if (typeof msg !== "object" || msg === null) {
      console.error("Invalid message format.");
      return from([undefined]);
    }
    return from([msg as { [key: string]: Package_Info }]);
  }),
  distinctUntilChanged((prev, curr) => deepEqual(prev, curr)),
  // 資料沒變時 distinctUntilChanged 不會再發,晚訂閱的元件(例如貨物面板)
  // 會一直拿不到資料,所以要 replay 最新一筆
  shareReplay({ bufferSize: 1, refCount: true }),
);

/** 每個包膜線點位的即時資料(登記的貨、燈號),key 是 locationId */
const usePackageSocket = () => {
  const [info, setInfo] = useState<{ [key: string]: Package_Info }>();

  useEffect(() => {
    const subscription = profiles$.subscribe((data) => {
      if (data) setInfo(data);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return info;
};

export default usePackageSocket;
