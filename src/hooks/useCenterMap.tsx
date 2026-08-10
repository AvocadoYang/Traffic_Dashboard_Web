import { RefObject, useCallback, useEffect } from "react";
import { useAtomValue } from "jotai";
import { centerMap } from "@/utils/gloable";
import useMap from "@/api/useMap";

/**
 * 決定地圖的初始視角:
 *  - 後端有設定 scrollX/scrollY(MapManager 可編輯) 時, 沿用該預設視角
 *  - 兩者皆為 0 (未設定) 時, 把底圖中心捲到可視範圍正中央
 *
 * 量測對象取 <img> 而非 .map-view, 因為只有底圖保證是地圖本體;
 * getBoundingClientRect 已經含 transform, 不必另外乘上 scale。
 *
 * 注意這裡只動捲動位置, 所以地圖必須大於可視範圍才有效果。Main 的 WebView
 * 另外讓 .map-view 收縮成地圖大小 + `margin: auto`, 小圖才也能置中;
 * Setting 的 .map-view 仍撐滿容器(拉框/拉線的事件綁在它上面), 小圖會停在左上角。
 *
 * 觸發時機: 底圖載入完成(進站 / 換地圖), 以及工具列的「地圖置中」按鈕。
 */
const useCenterMap = (
  mapWrapRef: RefObject<HTMLDivElement>,
  mapImageRef: RefObject<HTMLImageElement>,
) => {
  const cm = useAtomValue(centerMap);
  const { data } = useMap();
  const imageUrl = data?.imageUrl;
  const scrollX = data?.scrollX;
  const scrollY = data?.scrollY;

  const applyView = useCallback(() => {
    const container = mapWrapRef.current;
    if (!container) return;

    if (scrollX || scrollY) {
      container.scrollLeft = scrollX ?? 0;
      container.scrollTop = scrollY ?? 0;
      return;
    }

    const img = mapImageRef.current;
    if (!img?.naturalWidth) return;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // 先把底圖左上角換算回容器的內容座標, 再位移半張圖 / 半個可視範圍
    const left = imgRect.left - containerRect.left + container.scrollLeft;
    const top = imgRect.top - containerRect.top + container.scrollTop;

    container.scrollLeft = left + imgRect.width / 2 - container.clientWidth / 2;
    container.scrollTop = top + imgRect.height / 2 - container.clientHeight / 2;
  }, [mapWrapRef, mapImageRef, scrollX, scrollY]);

  useEffect(() => {
    const img = mapImageRef.current;
    if (!img) return;

    let raf = 0;
    // .map-view 尺寸與 scale 都是 state 因此 load 當下這一輪 re-render 還沒落地，等 load 圖片後再 requestAnimationFrame 讓它落地，才能量到正確尺寸。
    const run = () => {
      raf = requestAnimationFrame(applyView);
    };

    // 已快取的圖不會再觸發 load, 這裡補一次
    if (img.complete && img.naturalWidth) {
      run();
      return () => cancelAnimationFrame(raf);
    }

    img.addEventListener("load", run);
    return () => {
      img.removeEventListener("load", run);
      cancelAnimationFrame(raf);
    };
  }, [applyView, mapImageRef, imageUrl]);

  useEffect(() => {
    if (!cm) return;
    const raf = requestAnimationFrame(applyView);
    return () => cancelAnimationFrame(raf);
  }, [cm, applyView]);
};

export default useCenterMap;
