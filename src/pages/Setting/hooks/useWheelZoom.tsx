import { RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { filter, fromEvent, map, tap } from "rxjs";
import { Scale } from "@/utils/gloable";

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const ZOOM_SENSITIVITY = 0.0003;
const MAX_DELTA = 200;

const normalizeDelta = ({ deltaY, deltaMode }: WheelEvent) => {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 100 : 1);
  return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, pixels));
};

const useWheelZoom = (mapWrapRef: RefObject<HTMLDivElement>, scale: number) => {
  const setScale = useSetAtom(Scale);
  const scaleRef = useRef(scale);
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  scaleRef.current = scale;

  useEffect(() => {
    const wrapEl = mapWrapRef.current;
    if (!wrapEl) return;

    const wheelEvent$ = fromEvent<WheelEvent>(wrapEl, "wheel", {
      passive: false,
    }).pipe(
      tap((e) => e.preventDefault()),
      map((e) => {
        const prevScale = scaleRef.current;
        const nextScale = Math.min(
          MAX_SCALE,
          Math.max(
            MIN_SCALE,
            prevScale * Math.exp(-normalizeDelta(e) * ZOOM_SENSITIVITY),
          ),
        );
        const rect = wrapEl.getBoundingClientRect();

        return {
          prevScale,
          nextScale,
          cursorX: e.clientX - rect.left,
          cursorY: e.clientY - rect.top,
        };
      }),
      filter(({ prevScale, nextScale }) => nextScale !== prevScale),
      tap(({ prevScale, nextScale, cursorX, cursorY }) => {
        const { left: scrollLeft, top: scrollTop } =
          pendingScrollRef.current ?? {
            left: wrapEl.scrollLeft,
            top: wrapEl.scrollTop,
          };

        const contentX = (scrollLeft + cursorX) / prevScale;
        const contentY = (scrollTop + cursorY) / prevScale;

        pendingScrollRef.current = {
          left: contentX * nextScale - cursorX,
          top: contentY * nextScale - cursorY,
        };
        scaleRef.current = nextScale;
        setScale(nextScale);
      }),
    );

    const subscription = wheelEvent$.subscribe();

    return () => subscription.unsubscribe();
  }, [mapWrapRef, setScale]);

  useLayoutEffect(() => {
    const wrapEl = mapWrapRef.current;
    const pending = pendingScrollRef.current;
    if (!wrapEl || !pending) return;

    pendingScrollRef.current = null;
    wrapEl.scrollLeft = Math.max(0, pending.left);
    wrapEl.scrollTop = Math.max(0, pending.top);
  }, [scale, mapWrapRef]);
};

export default useWheelZoom;
