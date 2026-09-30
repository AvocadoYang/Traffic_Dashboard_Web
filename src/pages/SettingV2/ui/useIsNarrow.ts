import { useEffect, useState } from "react";
import { NARROW } from "./tokens";

/**
 * 面板區域在窄螢幕時要改用卡片式清單。這裡直接量視窗寬度即可——
 * 面板欄寬度是跟著視窗走的,不需要 ResizeObserver 那麼精細。
 */
const useIsNarrow = (): boolean => {
  const [isNarrow, setIsNarrow] = useState(
    () => window.matchMedia(NARROW).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(NARROW);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener("change", onChange);
    setIsNarrow(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isNarrow;
};

export default useIsNarrow;
