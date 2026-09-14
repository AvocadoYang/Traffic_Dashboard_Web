import { RefObject, useEffect } from "react";

/** 位移超過此距離(px)才算拖曳，避免壓掉一般點擊 */
const DRAG_THRESHOLD = 4;

/**
 * 讓地圖可以用滑鼠拖曳平移。
 * 直接改捲動容器的 scrollLeft/scrollTop，不額外加 transform，
 * 才不會影響其他用 getBoundingClientRect 反推 rviz 座標的邏輯。
 */
const useDragPan = (
  mapWrapRef: RefObject<HTMLDivElement>,
  mapRef: RefObject<HTMLDivElement>,
  mapImageRef: RefObject<HTMLImageElement>,
  enabled = true,
) => {
  useEffect(() => {
    const container = mapWrapRef.current;
    if (!container) return;

    let pointerId: number | null = null;
    let dragged = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    /** 左鍵只在底圖或空白處啟動，中鍵則不限位置 */
    const canStart = (e: PointerEvent) => {
      if (e.button === 1) return true;
      if (e.button !== 0 || !enabled) return false;
      const target = e.target;
      return (
        target === mapImageRef.current ||
        target === mapRef.current ||
        target === container
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || pointerId !== null || !canStart(e)) {
        return;
      }
      pointerId = e.pointerId;
      dragged = false;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = container.scrollLeft;
      startTop = container.scrollTop;
      container.setPointerCapture(e.pointerId);
      container.style.cursor = "grabbing";
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragged = true;
      container.scrollLeft = startLeft - dx;
      container.scrollTop = startTop - dy;
      e.preventDefault();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (container.hasPointerCapture(e.pointerId)) {
        container.releasePointerCapture(e.pointerId);
      }
      pointerId = null;
      container.style.cursor = "";
    };

    /** 拖曳結束後的那次 click 不該觸發地圖上的點擊行為 */
    const handleClickCapture = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerUp);
    container.addEventListener("click", handleClickCapture, true);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointercancel", handlePointerUp);
      container.removeEventListener("click", handleClickCapture, true);
      container.style.cursor = "";
    };
  }, [mapWrapRef, mapRef, mapImageRef, enabled]);
};

export default useDragPan;
