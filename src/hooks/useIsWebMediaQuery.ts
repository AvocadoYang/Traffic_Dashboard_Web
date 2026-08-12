import { useEffect, useState } from "react";
import {
  defer,
  distinctUntilChanged,
  fromEventPattern,
  map,
  shareReplay,
  startWith,
} from "rxjs";
import { breakpoints } from "@/styles/responsive";

const mql = window.matchMedia(`(min-width: ${breakpoints.web}px)`);

/**
 * defer 讓 startWith 在「訂閱當下」才讀 mql.matches，
 * 不然那個值會在 module 載入時就被固定住。
 */
const isWeb$ = defer(() =>
  fromEventPattern<MediaQueryListEvent>(
    (next) => {
      mql.addEventListener("change", next);
      return next;
    },
    (next) => {
      mql.removeEventListener("change", next);
    },
  ).pipe(
    map((e) => e.matches),
    startWith(mql.matches),
  ),
).pipe(
  distinctUntilChanged(),
  // 多個元件共用同一個 listener，晚訂閱的直接拿到目前值
  shareReplay({ bufferSize: 1, refCount: true }),
);

const useIsWebMediaQuery = () => {
  const [isWeb, setIsWeb] = useState(() => mql.matches);

  useEffect(() => {
    const subscription = isWeb$.subscribe(setIsWeb);
    return () => subscription.unsubscribe();
  }, []);

  return isWeb;
};

export default useIsWebMediaQuery;
