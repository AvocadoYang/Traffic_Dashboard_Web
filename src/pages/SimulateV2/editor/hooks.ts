import { RefObject, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";

export function useElementSize(ref: RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** 載入圖片給 Konva 用; url 換了就重新載 */
export function useHtmlImage(url: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    setImage(null);
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    let alive = true;
    img.onload = () => alive && setImage(img);
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return image;
}

/** 站點類型的顏色: 深色、淺色底都看得清楚的中間色 */
export const STATION_COLORS = {
  pick: "#2f7ed8",
  drop: "#e2712b",
  both: "#8a55d1",
} as const;

/** 畫布要用的顏色, 跟著主題和「底圖顯示方式」走 (主題沒變就是同一個物件, 畫布可以不重畫) */
export function useCanvasColors() {
  const theme = useAtomValue(themeAtom);
  const mode = useAtomValue(mapImageModeAtom);
  return useMemo(() => canvasColorsOf(theme, mode), [theme, mode]);
}

export function canvasColorsOf(theme: Parameters<typeof resolveColors>[0], mode: Parameters<typeof resolveColors>[1]) {
  const colors = resolveColors(theme, mode);
  const paper = getMapCanvas(theme, mode).paper;
  return {
    paper,
    ink: colors.text,
    muted: colors.textMuted,
    road: colors.mapRoad,
    point: colors.mapPoint,
    accent: colors.accent,
    standby: colors.success,
    danger: colors.danger,
    /** CAD 圖的線: 比路線淡, 不搶眼 */
    cad: theme.mode === "dark" && mode === "themed" ? "#8f8e88" : "#6f6e69",
    /** 吸附到 CAD 點的記號 */
    snap: "#d9730d",
    dark: theme.mode === "dark" && mode === "themed",
  };
}

export type CanvasColors = ReturnType<typeof canvasColorsOf>;
