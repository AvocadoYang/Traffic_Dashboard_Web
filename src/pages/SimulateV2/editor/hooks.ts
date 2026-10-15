import { RefObject, useEffect, useState } from "react";
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

/** 畫布要用的顏色, 跟著主題和「底圖顯示方式」走 */
export function useCanvasColors() {
  const theme = useAtomValue(themeAtom);
  const mode = useAtomValue(mapImageModeAtom);
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
    dark: theme.mode === "dark" && mode === "themed",
  };
}

export type CanvasColors = ReturnType<typeof useCanvasColors>;
