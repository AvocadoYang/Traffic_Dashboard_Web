import { FC, ReactNode, RefObject, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import styled from "styled-components";
import useMap from "@/api/useMap";
import useName from "@/api/useAmrName";
import useAMRsample from "@/api/useAMRsample";
import { MapImage } from "@/pages/Setting/mapComponents/components";
import {
  AmrFilterCarCard,
  centerMap,
  hintAmr,
  hoverRoad,
  locationHoverInfo,
  roadHoverInfo,
  Scale,
  showZoneForbidden,
  tooltipProp,
} from "@/utils/gloable";
import {
  isShowAnnotation,
  isShowLocation,
  isShowPointCloud,
  isShowRoad,
  isShowRoadTooltip,
  showAllZonesSwitch,
} from "@/utils/siderGloble";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { buildMapImageMatrix, getMapCanvas, mapImageModeAtom, resolveColors, themeAtom } from "@/theme";
import { isDarkColor } from "@/theme/mapImage";
import { buildScene } from "./scene";
import { createLiveStore, LiveStore } from "./liveStore";
import { AmrHit, drawBase, drawLive, Frame } from "./draw";
import { MapView, initialView, wheelFactor, zoomTo } from "./view";
import { amrAt, nearbyPoints, nearbyRoads, pauseSignAt, pointAt, roadAt } from "./hitTest";
import MapOverlay, { hiddenZoneIdsAtom, pauseHintAtom } from "./MapOverlay";

/**
 * 用 canvas 畫的地圖 (首頁 main-v2 用; 之後 setting-v3 也用這個)。
 *
 * 由下到上四層, 共用同一個平移縮放:
 *  1. 底圖 <img>: 底圖跟後端不同來源, 畫進 canvas 會讀不到像素, 主題濾鏡也只能掛在 DOM 上;
 *     一張圖片做 CSS transform 很便宜
 *  2. 底層 canvas: 標註、路線、區域、點位
 *  3. 設備層 (children): 貨架、輸送帶、電梯…這些舊的 React 元件原封不動, 座標一樣是底圖像素
 *  4. 上層 canvas: 點雲、車框、車、車的提示框 (不吃滑鼠, 底下的設備照樣點得到)
 *  5. 最上層 DOM: 區域名稱、點位 / 路線的提示標籤 (MapOverlay)
 *
 * 畫布上的點位、路線、車沒有 DOM 元素, 游標指著什麼由 hitTest 算距離;
 * hover 的結果寫進舊地圖用的同一組 atom (tooltipProp、hoverRoad、locationHoverInfo…),
 * 舊的提示標籤元件不用改就能用。
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
  /** 點了點位 (首頁: 打開直接移動; 設定頁: 點位偵測) */
  onPointClick?: (locationId: string) => void;
  /** 疊在最上層的 DOM (設定頁的編輯工具: 打點的小紅點、拉線、框選…), 座標是底圖像素 */
  overlay?: ReactNode;
  /** 左鍵在空白處拖曳地圖; 設定頁打點 / 框選時左鍵要留給編輯工具 (中鍵、觸控照樣拖) */
  leftButtonPans?: boolean;
  /** 畫車、點雲 (舊設定頁沒有車) */
  showAmrs?: boolean;
  /** 標註不看工具列的「顯示標註」開關一律畫 (舊設定頁也是) */
  alwaysShowAnnotations?: boolean;
  /** 標註不要畫在畫布上 (設定頁編輯標註時改用 DOM 版, 才能拖曳) */
  hideAnnotations?: boolean;
  /**
   * 給舊的編輯 hook 用 (useMousePoint、useZoneFrame…): 它們拿底圖 <img> 的
   * getBoundingClientRect() 和 Scale atom 換算座標, 底圖就在跟著平移縮放的那一層, 照樣算得對
   */
  mapImageRef?: RefObject<HTMLImageElement>;
  /** 地圖最外層 (滑鼠事件都會冒泡到這裡) */
  wrapRef?: RefObject<HTMLDivElement>;
};

/** 游標附近沒有點位時用同一個空集合, 底層才不會每次移動都重畫 */
const NO_IDS = new Set<string>();

const sameIds = (a: string[], b: Set<string>) => a.length === b.size && a.every((id) => b.has(id));

const CanvasMap: FC<Props> = ({
  children,
  onPointClick,
  overlay,
  leftButtonPans = true,
  showAmrs = true,
  alwaysShowAnnotations = false,
  hideAnnotations = false,
  mapImageRef,
  wrapRef: wrapRefProp,
}) => {
  const { data, isLoading, isError } = useMap();
  const { data: names } = useName();
  const { data: robotTypes } = useAMRsample();

  const ownWrapRef = useRef<HTMLDivElement>(null);
  const wrapRef = wrapRefProp ?? ownWrapRef;
  const leftButtonPansRef = useRef(leftButtonPans);
  leftButtonPansRef.current = leftButtonPans;
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const deviceLayerRef = useRef<HTMLDivElement>(null);
  const overlayLayerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);

  const viewRef = useRef<MapView | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const storeRef = useRef<LiveStore | null>(null);
  const lastClaimedRef = useRef<Map<string, string> | null>(null);
  const showAmrsRef = useRef(showAmrs);
  showAmrsRef.current = showAmrs;
  /** 上一幀畫出來的車的範圍, 點選用 */
  const hitsRef = useRef<AmrHit[]>([]);
  /** 游標現在指著什麼 */
  const hoverRef = useRef<{
    pointId: string | null;
    roadId: string | null;
    amrId: string | null;
    pause: boolean;
    nearby: Set<string>;
  }>({ pointId: null, roadId: null, amrId: null, pause: false, nearby: NO_IDS });

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
  const annotationSwitch = useAtomValue(isShowAnnotation);
  const showAnnotation = !hideAnnotations && (alwaysShowAnnotations || annotationSwitch);
  const showZones = useAtomValue(showAllZonesSwitch);
  const showRoadTooltip = useAtomValue(isShowRoadTooltip);
  const hiddenZoneIds = useAtomValue(hiddenZoneIdsAtom);
  const setTooltip = useSetAtom(tooltipProp);
  const setHoverRoad = useSetAtom(hoverRoad);
  const setLocationHover = useSetAtom(locationHoverInfo);
  const setRoadHover = useSetAtom(roadHoverInfo);
  const setPauseHint = useSetAtom(pauseHintAtom);
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
    hiddenZoneIds,
    showRoadTooltip,
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
    hiddenZoneIds,
    showRoadTooltip,
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
      if (overlayLayerRef.current) overlayLayerRef.current.style.transform = transform;
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
        hoveredPointId: hoverRef.current.pointId,
        hoveredRoadId: hoverRef.current.roadId,
        nearbyPointIds: hoverRef.current.nearby,
        hiddenZoneIds: o.hiddenZoneIds,
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
    if (dirty.live && live && !showAmrsRef.current) {
      live.setTransform(1, 0, 0, 1, 0, 0);
      live.clearRect(0, 0, live.canvas.width, live.canvas.height);
      hitsRef.current = [];
    } else if (dirty.live && live && store) {
      const frame: Frame = { ctx: live, view, width, height, dpr, colors: o.colors, darkCanvas: o.darkCanvas };
      const res = o.scene.resolution;
      hitsRef.current = drawLive(frame, o.scene, store.state, {
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
  }, [scene, showLocation, showRoad, showAnnotation, showZones, hiddenZoneIds, colors, darkCanvas, requestDraw]);
  useEffect(() => {
    requestDraw({ live: true });
  }, [scene, amrIds, filterIds, forbiddenIds, hintId, currentMapId, showPointCloud, showAmrs, colors, darkCanvas, robotTypes, requestDraw]);

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
      e.button === 1 ||
      (e.button === 0 && leftButtonPansRef.current && (e.target === baseRef.current || e.target === wrap));

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
      // 新的一次按下: 上一次拖曳留下的「吃掉下一個 click」不算數
      // (中鍵拖曳放開時瀏覽器不發 click, 不清掉的話會吃掉之後真正的點擊)
      if (pointers.size === 0) suppressClick = false;
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

    // ---------------- hover: 游標指著什麼 (每幀最多算一次)
    let hoverFrame = 0;
    let hoverAt: { x: number; y: number; onCanvas: boolean } | null = null;

    const applyHover = () => {
      hoverFrame = 0;
      const view = viewRef.current;
      const o = optsRef.current;
      const scene = o.scene;
      const h = hoverRef.current;
      if (!view || !scene) return;
      const at = hoverAt;

      // 車畫在最上層, 疊在設備上面時也算指著車 (舊地圖車的 z-index 也比設備高)
      const amr = at ? amrAt(hitsRef.current, view, at.x, at.y) : null;
      const point = at?.onCanvas && !amr && o.showLocation ? pointAt(scene, view, at.x, at.y) : null;
      const roadId = at?.onCanvas && !amr && !point && o.showRoad ? roadAt(scene, view, at.x, at.y) : null;
      const pause = !!amr && pauseSignAt(amr, view, at!.x, at!.y);
      // 附近的點位一律算 (點位放大); 附近的路線只有「路徑提示」開著才算
      const near = at ? nearbyPoints(scene, view, at.x, at.y) : [];
      const nearRoads = at && o.showRoad && o.showRoadTooltip ? nearbyRoads(scene, view, at.x, at.y) : [];
      const mx = at ? (at.x - view.x) / view.scale : 0;
      const my = at ? (at.y - view.y) / view.scale : 0;

      let baseDirty = false;
      const pointId = point?.id ?? null;
      if (pointId !== h.pointId) {
        h.pointId = pointId;
        baseDirty = true;
        if (point) {
          const [x, y] = scene.toRos(point.x, point.y);
          setTooltip({ x, y, locationId: point.id });
        } else setTooltip(null);
      }
      if (roadId !== h.roadId) {
        h.roadId = roadId;
        baseDirty = true;
        setHoverRoad(roadId ?? "");
      }
      if (!sameIds(near, h.nearby)) {
        h.nearby = near.length ? new Set(near) : NO_IDS;
        baseDirty = true;
      }
      setLocationHover(near.length ? { x: mx, y: my, locationIds: near } : null);
      setRoadHover(nearRoads.length ? { x: mx, y: my, roadIds: nearRoads } : null);
      const amrId = amr?.id ?? null;
      if (amrId !== h.amrId || pause !== h.pause) {
        h.amrId = amrId;
        h.pause = pause;
        setPauseHint(pause && amr ? { x: amr.x + 10 * Math.sin(amr.angle), y: amr.y - 10 * Math.cos(amr.angle) } : null);
      }
      if (!drag) {
        const clickable = (amr && amr.clickable) || point || roadId;
        wrap.style.cursor = clickable ? "pointer" : "";
      }
      if (baseDirty) requestDrawRef.current({ base: true });
    };

    const scheduleHover = (next: typeof hoverAt) => {
      hoverAt = next;
      if (!hoverFrame) hoverFrame = requestAnimationFrame(applyHover);
    };

    const onHoverMove = (e: PointerEvent) => {
      // 只有滑鼠有 hover; 拖曳中不算
      if (e.pointerType !== "mouse" || pointers.size) return;
      const p = local(e);
      scheduleHover({ ...p, onCanvas: e.target === baseRef.current });
    };
    const onLeave = () => scheduleHover(null);

    /** 中鍵拖曳放開時的 auxclick 也不該觸發地圖上的動作 (貨架的中鍵是改欄位) */
    const onAuxClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    const onClickCapture = (e: MouseEvent) => {
      // 拖曳結束後的那次 click 不該觸發地圖上的點擊行為
      if (suppressClick) {
        suppressClick = false;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      // 點到車: 車疊在設備上面時, 設備不該收到這次點擊; 跟舊地圖一樣只有堆高機會切換車卡片的選取
      const view = viewRef.current;
      if (!view) return;
      const p = local(e);
      const amr = amrAt(hitsRef.current, view, p.x, p.y);
      if (!amr) return;
      e.stopPropagation();
      e.preventDefault();
      setForbiddenIds((prev) => (prev.size ? new Set() : prev));
      if (!amr.clickable) return;
      setFilterIds((prev) => {
        const next = new Set(prev);
        if (next.has(amr.id)) next.delete(amr.id);
        else next.add(amr.id);
        return next;
      });
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("click", onClickCapture, true);
    wrap.addEventListener("auxclick", onAuxClickCapture, true);
    wrap.addEventListener("pointermove", onHoverMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(hoverFrame);
      wrap.removeEventListener("pointermove", onHoverMove);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("click", onClickCapture, true);
      wrap.removeEventListener("auxclick", onAuxClickCapture, true);
    };
  }, [setView, isLoading, isError, setTooltip, setHoverRoad, setLocationHover, setRoadHover, setPauseHint, setFilterIds, setForbiddenIds]);

  // 離開頁面時把 hover 留下的提示清掉, 別的頁面 (舊首頁、設定頁) 也讀這幾顆 atom
  useEffect(
    () => () => {
      setTooltip(null);
      setHoverRoad("");
      setLocationHover(null);
      setRoadHover(null);
      setPauseHint(null);
    },
    [setTooltip, setHoverRoad, setLocationHover, setRoadHover, setPauseHint],
  );

  /**
   * 點畫布, 規則同舊地圖:
   *  - 任何點擊都取消區域禁行的標示
   *  - 點到車: 在上面的 click capture 就處理掉了 (車可能疊在設備上)
   *  - 點到點位: onPointClick (首頁打開直接移動)
   *  - 點到空白處: 取消車卡片的選取
   */
  const onPointClickRef = useRef(onPointClick);
  onPointClickRef.current = onPointClick;
  const onBaseClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const view = viewRef.current;
      const scene = optsRef.current.scene;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setForbiddenIds((prev) => (prev.size ? new Set() : prev));
      if (!view || !scene) return;

      const point = optsRef.current.showLocation ? pointAt(scene, view, x, y) : null;
      if (point) {
        onPointClickRef.current?.(point.id);
        return;
      }
      setFilterIds((prev) => (prev.size ? new Set() : prev));
    },
    [setFilterIds, setForbiddenIds],
  );

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
          ref={mapImageRef}
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
      <TransformLayer ref={overlayLayerRef}>
        {scene ? <MapOverlay scene={scene} /> : null}
        {overlay}
      </TransformLayer>
    </Wrap>
  );
};

export default memo(CanvasMap);
