import { FC, ReactNode, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useMap from "@/api/useMap";
import useName from "@/api/useAmrName";
import useAMRsample from "@/api/useAMRsample";
import { MapImage } from "@/pages/Setting/mapComponents/components";
import {
  AmrFilterCarCard,
  centerMap,
  hintAmr,
  Scale,
  showZoneForbidden,
} from "@/utils/gloable";
import {
  isShowAnnotation,
  isShowLocation,
  isShowPointCloud,
  isShowRoad,
  showAllZonesSwitch,
} from "@/utils/siderGloble";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { buildMapImageMatrix, getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";
import { isDarkColor } from "@/theme/mapImage";
import { buildScene } from "./scene";
import { createLiveStore, LiveStore } from "./liveStore";
import { drawBase, drawLive, Frame } from "./draw";
import { MapView, initialView, wheelFactor, zoomTo } from "./view";

/**
 * 用 canvas 畫的地圖 (首頁 main-v2 用; 之後 setting-v3 也用這個)。
 *
 * 由下到上四層, 共用同一個平移縮放:
 *  1. 底圖 <img>: 底圖跟後端不同來源, 畫進 canvas 會讀不到像素, 主題濾鏡也只能掛在 DOM 上;
 *     一張圖片做 CSS transform 很便宜
 *  2. 底層 canvas: 標註、路線、區域、點位
 *  3. 設備層 (children): 貨架、輸送帶、電梯…這些舊的 React 元件原封不動, 座標一樣是底圖像素
 *  4. 上層 canvas: 點雲、車框、車、車的提示框 (不吃滑鼠, 底下的設備照樣點得到)
 *
 * 視角放在 ref 裡, 平移縮放不經過 React; 跟全域的 Scale atom 雙向同步,
 * 舊的工具列 (ZoomPad 的放大縮小、地圖置中) 和定位校正殘影照樣能用。
 */

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  cursor: grab;
  /* 設備元件的 z-index 很大 (車 200000), 關在地圖裡面, 不要蓋過地圖上的工具列 */
  isolation: isolate;
`;

/** 跟著視角平移縮放的 DOM 圖層; 本身沒有大小, 不擋滑鼠 */
const TransformLayer = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;
`;

const Canvas = styled.canvas<{ $passive?: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: ${({ $passive }) => ($passive ? "none" : "auto")};
`;

const StatusWrap = styled.div`
  position: absolute;
  inset: 0;
`;

/** 位移超過此距離 (px) 才算拖曳, 避免壓掉一般點擊 */
const DRAG_THRESHOLD = 4;

/** MiR 圖示寬度固定, 長度照車型; 查不到車型時的長度 (地圖像素) */
const MIR_FALLBACK_LENGTH = 20;
const robotTypeValueOf = (amrId: string) =>
  (amrId.includes("#") ? amrId.split("#")[1] : amrId).split("-").slice(0, 3).join("-");

type Props = {
  /** 設備層: 畫在底層 canvas 和車中間的 DOM 元件, 座標是底圖像素 */
  children?: ReactNode;
};

const CanvasMap: FC<Props> = ({ children }) => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMap();
  const { data: names } = useName();
  const { data: robotTypes } = useAMRsample();

  const wrapRef = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const deviceLayerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);

  const viewRef = useRef<MapView | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const storeRef = useRef<LiveStore | null>(null);
  const lastClaimedRef = useRef<Map<string, string> | null>(null);

  const [scale, setScale] = useAtom(Scale);
  /** 最後一次由畫布自己寫進 Scale atom 的值, 用來分辨 atom 的變動是不是自己造成的 */
  const writtenScaleRef = useRef<number | null>(null);
  const cm = useAtomValue(centerMap);
  const [filterIds, setFilterIds] = useAtom(AmrFilterCarCard);
  const [forbiddenIds, setForbiddenIds] = useAtom(showZoneForbidden);
  const hintId = useAtomValue(hintAmr);
  const showLocation = useAtomValue(isShowLocation);
  const showRoad = useAtomValue(isShowRoad);
  const showPointCloud = useAtomValue(isShowPointCloud);
  const showAnnotation = useAtomValue(isShowAnnotation);
  const showZones = useAtomValue(showAllZonesSwitch);
  const currentMapId = useAtomValue(currentMapIdAtom);
  const theme = useAtomValue(themeAtom);
  const mapImageMode = useAtomValue(mapImageModeAtom);

  const scene = useMemo(() => (data ? buildScene(data) : null), [data]);

  const amrIds = useMemo(() => {
    if (!names) return [];
    return names.amrs.filter((v) => (names.isSim ? v.isReal === false : v.isReal)).map((v) => v.amrId);
  }, [names]);

  const colors = useMemo(() => resolveColors(theme, mapImageMode), [theme, mapImageMode]);
  const darkCanvas = useMemo(() => isDarkColor(getMapCanvas(theme, mapImageMode).paper), [theme, mapImageMode]);
  const matrix = useMemo(() => buildMapImageMatrix(getMapCanvas(theme, mapImageMode)), [theme, mapImageMode]);
  const filterId = `canvas-map-image-${useId().replace(/:/g, "")}`;

  // ------------------------------------------------------------ 畫

  const dirtyRef = useRef({ base: true, live: true, layers: true });
  const frameRef = useRef(0);
  const mirIconsRef = useRef(new Map<string, HTMLImageElement | null>());

  // 每一幀要用的設定都放進 ref, rAF 裡讀最新的, 不用每次重綁
  const optsRef = useRef({
    scene,
    showLocation,
    showRoad,
    showPointCloud,
    showAnnotation,
    showZones,
    amrIds,
    filterIds,
    forbiddenIds,
    hintId,
    currentMapId,
    colors,
    darkCanvas,
    robotTypes,
    disabledZoneLabel: t("zone_enable.disabled"),
  });
  optsRef.current = {
    scene,
    showLocation,
    showRoad,
    showPointCloud,
    showAnnotation,
    showZones,
    amrIds,
    filterIds,
    forbiddenIds,
    hintId,
    currentMapId,
    colors,
    darkCanvas,
    robotTypes,
    disabledZoneLabel: t("zone_enable.disabled"),
  };

  const render = useCallback(() => {
    frameRef.current = 0;
    const view = viewRef.current;
    const o = optsRef.current;
    const { width, height, dpr } = sizeRef.current;
    const dirty = dirtyRef.current;
    if (!view || !o.scene || !width || !height) return;

    if (dirty.layers) {
      const transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
      if (imageLayerRef.current) imageLayerRef.current.style.transform = transform;
      if (deviceLayerRef.current) deviceLayerRef.current.style.transform = transform;
    }

    const store = storeRef.current;
    const base = baseRef.current?.getContext("2d");
    if (dirty.base && base) {
      const frame: Frame = { ctx: base, view, width, height, dpr, colors: o.colors, darkCanvas: o.darkCanvas };
      const icons = mirIconsRef.current;
      drawBase(frame, o.scene, {
        showRoad: o.showRoad,
        showLocation: o.showLocation,
        showZones: o.showZones,
        showAnnotation: o.showAnnotation,
        claimedRoads: store?.state.claimedRoads ?? new Map(),
        disabledZoneLabel: o.disabledZoneLabel,
        mirIcon: (areaType) => {
          if (!icons.has(areaType)) {
            icons.set(areaType, null);
            const img = new Image();
            img.onload = () => {
              icons.set(areaType, img);
              requestDrawRef.current({ base: true });
            };
            img.src = `/${areaType}.png`;
          }
          return icons.get(areaType) ?? null;
        },
      });
      lastClaimedRef.current = store?.state.claimedRoads ?? null;
    }

    const live = liveRef.current?.getContext("2d");
    if (dirty.live && live && store) {
      const frame: Frame = { ctx: live, view, width, height, dpr, colors: o.colors, darkCanvas: o.darkCanvas };
      const res = o.scene.resolution;
      drawLive(frame, o.scene, store.state, {
        amrIds: o.amrIds,
        showPointCloud: o.showPointCloud,
        currentMapId: o.currentMapId,
        filterIds: o.filterIds,
        hintId: o.hintId,
        forbiddenIds: o.forbiddenIds,
        mirLength: (amrId) => {
          const value = robotTypeValueOf(amrId);
          const type = o.robotTypes?.find((r) => r.value === value);
          return type && type.length > 0 ? type.length / res : MIR_FALLBACK_LENGTH;
        },
      });
    }
    dirtyRef.current = { base: false, live: false, layers: false };
  }, []);

  const requestDraw = useCallback(
    (what: Partial<{ base: boolean; live: boolean; layers: boolean }>) => {
      const d = dirtyRef.current;
      d.base ||= !!what.base;
      d.live ||= !!what.live;
      d.layers ||= !!what.layers;
      if (!frameRef.current) frameRef.current = requestAnimationFrame(render);
    },
    [render],
  );
  const requestDrawRef = useRef(requestDraw);
  requestDrawRef.current = requestDraw;

  const redrawAll = useCallback(() => requestDraw({ base: true, live: true, layers: true }), [requestDraw]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      // 開發模式 StrictMode 會卸載再掛載一次, 不歸零的話之後永遠排不進下一幀
      frameRef.current = 0;
    },
    [],
  );

  // 設定、主題、地圖資料變了: 重畫
  useEffect(() => {
    requestDraw({ base: true });
  }, [scene, showLocation, showRoad, showAnnotation, showZones, colors, darkCanvas, requestDraw]);
  useEffect(() => {
    requestDraw({ live: true });
  }, [scene, amrIds, filterIds, forbiddenIds, hintId, currentMapId, showPointCloud, colors, darkCanvas, robotTypes, requestDraw]);

  // 即時資料: 訂閱 socket, 每次有新訊息就排下一幀
  useEffect(() => {
    const store = createLiveStore();
    storeRef.current = store;
    const off = store.subscribe(() => {
      // 佔用的路線換了, 底層也要重畫
      const claimedChanged = store.state.claimedRoads !== lastClaimedRef.current;
      requestDrawRef.current({ live: true, base: claimedChanged });
    });
    return () => {
      off();
      store.dispose();
      storeRef.current = null;
    };
  }, []);

  // ------------------------------------------------------------ 視角

  const setView = useCallback(
    (next: MapView, syncAtom: boolean) => {
      viewRef.current = next;
      redrawAll();
      if (syncAtom) {
        writtenScaleRef.current = next.scale;
        setScale(next.scale);
      }
    },
    [redrawAll, setScale],
  );

  const resetView = useCallback(() => {
    const { width, height } = sizeRef.current;
    if (!data || !width || !height) return;
    setView(initialView(data, width, height), true);
  }, [data, setView]);

  // 畫布大小跟著容器
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { width, height, dpr };
      for (const c of [baseRef.current, liveRef.current]) {
        if (!c) continue;
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      if (!viewRef.current) resetView();
      redrawAll();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [resetView, redrawAll, isLoading, isError]);

  // 換地圖 (底圖網址變了) 或按「地圖置中」: 回到預設視角
  const imageUrl = data?.imageUrl;
  useEffect(() => {
    resetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, data?.mapId, cm]);

  // 別人改了 Scale (工具列的放大縮小): 以畫面中心縮放
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (writtenScaleRef.current !== null && Math.abs(writtenScaleRef.current - scale) < 1e-9) return;
    if (Math.abs(view.scale - scale) < 1e-9) return;
    const { width, height } = sizeRef.current;
    setView(zoomTo(view, width / 2, height / 2, scale), false);
    writtenScaleRef.current = null;
  }, [scale, setView]);

  // 滾輪縮放、拖曳平移、觸控 (一指平移、兩指縮放)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const local = (e: { clientX: number; clientY: number }) => {
      const rect = wrap.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const view = viewRef.current;
      if (!view) return;
      const p = local(e);
      setView(zoomTo(view, p.x, p.y, view.scale * wheelFactor(e)), true);
    };

    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { startX: number; startY: number; view: MapView; moved: boolean } | null = null;
    let pinch: { dist: number; mid: { x: number; y: number }; view: MapView } | null = null;
    let suppressClick = false;

    /** 滑鼠左鍵只在空白處 (底層畫布) 開始拖曳, 設備上的按鈕照常點; 中鍵不限位置 */
    const canStartMouse = (e: PointerEvent) =>
      e.button === 1 || (e.button === 0 && (e.target === baseRef.current || e.target === wrap));

    const startPinch = () => {
      const [a, b] = [...pointers.values()];
      const view = viewRef.current;
      if (!view) return;
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view,
      };
      drag = null;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        if (!canStartMouse(e) || drag) return;
        if (e.button === 1) e.preventDefault();
      }
      const view = viewRef.current;
      if (!view) return;
      pointers.set(e.pointerId, local(e));
      if (e.pointerType !== "mouse" && pointers.size === 2) {
        startPinch();
        return;
      }
      if (pointers.size === 1) {
        const p = local(e);
        drag = { startX: p.x, startY: p.y, view, moved: false };
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, local(e));
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const zoomed = zoomTo(pinch.view, pinch.mid.x, pinch.mid.y, (pinch.view.scale * dist) / pinch.dist);
        setView({ ...zoomed, x: zoomed.x + mid.x - pinch.mid.x, y: zoomed.y + mid.y - pinch.mid.y }, true);
        suppressClick = true;
        return;
      }
      if (!drag) return;
      const p = local(e);
      const dx = p.x - drag.startX;
      const dy = p.y - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!drag.moved) {
        drag.moved = true;
        wrap.setPointerCapture(e.pointerId);
        wrap.style.cursor = "grabbing";
      }
      suppressClick = true;
      setView({ ...drag.view, x: drag.view.x + dx, y: drag.view.y + dy }, false);
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      if (wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
      if (pinch && pointers.size < 2) {
        pinch = null;
        // 放開一指之後, 剩下那一指接著平移
        const rest = [...pointers.values()][0];
        const view = viewRef.current;
        drag = rest && view ? { startX: rest.x, startY: rest.y, view, moved: true } : null;
        return;
      }
      if (pointers.size === 0) {
        drag = null;
        wrap.style.cursor = "";
      }
    };

    /** 拖曳結束後的那次 click 不該觸發地圖上的點擊行為 */
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("click", onClickCapture, true);
    return () => {
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("click", onClickCapture, true);
    };
  }, [setView, isLoading, isError]);

  // 點地圖空白處: 取消車卡片選的車、區域禁行的標示 (同舊地圖點底圖)
  const onBaseClick = useCallback(() => {
    if (forbiddenIds.size) setForbiddenIds(new Set());
    if (filterIds.size) setFilterIds(new Set());
  }, [filterIds, forbiddenIds, setFilterIds, setForbiddenIds]);

  if (isLoading || isError || !data) {
    return (
      <StatusWrap>
        <MapImage />
      </StatusWrap>
    );
  }

  return (
    <Wrap ref={wrapRef}>
      <TransformLayer ref={imageLayerRef}>
        <img
          src={data.imageUrl}
          draggable={false}
          alt=""
          style={{ display: "block", userSelect: "none", filter: matrix ? `url(#${filterId})` : undefined }}
          onDragStart={(e) => e.preventDefault()}
        />
        {matrix ? (
          <svg width="0" height="0" aria-hidden style={{ position: "absolute", pointerEvents: "none" }}>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={matrix} />
            </filter>
          </svg>
        ) : null}
      </TransformLayer>
      <Canvas ref={baseRef} onClick={onBaseClick} />
      <TransformLayer ref={deviceLayerRef}>{children}</TransformLayer>
      <Canvas ref={liveRef} $passive />
    </Wrap>
  );
};

export default memo(CanvasMap);
