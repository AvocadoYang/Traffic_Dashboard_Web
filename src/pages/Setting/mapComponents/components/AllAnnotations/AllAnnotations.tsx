import {
  CSSProperties,
  FC,
  PointerEvent as ReactPointerEvent,
  RefObject,
  memo,
  useEffect,
  useRef,
} from "react";
import { message } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import useMap, { type MapType } from "@/api/useMap";
import { EditAnnotationSwitch, isShowAnnotation } from "@/utils/siderGloble";
import { rosCoord2DisplayCoord, rvizCoord } from "@/utils/utils";
import {
  type Annotation,
  type AnnotationDraft,
  annotationDraftAtom,
  annotationStyleAtom,
  annotationToolAtom,
  isDraftDirty,
  normalizeRect,
  toDraft,
} from "./annotationAtoms";

type Props = {
  scale: number;
  /** 設定頁才給: 有這兩個 ref 且地圖標註面板開著, 標註才能點選、拖曳、新增 */
  mapRef?: RefObject<HTMLDivElement>;
  mapImageRef?: RefObject<HTMLImageElement>;
};

type DragMode = "move" | "resize" | "rotate";

/** 拉框小於這個 (螢幕像素) 當成誤觸, 不建立 */
const MIN_RECT_PX = 4;

const toDisplay = (map: MapType, x: number, y: number) =>
  rosCoord2DisplayCoord({
    x,
    y,
    mapHeight: map.mapHeight,
    mapOriginX: map.mapOriginX,
    mapOriginY: map.mapOriginY,
    mapResolution: map.mapResolution,
  });

const textStyle = (a: AnnotationDraft): CSSProperties => ({
  fontSize: a.fontSize,
  lineHeight: 1.25,
  color: a.color || undefined,
  background: a.backgroundColor || "transparent",
  padding: a.backgroundColor ? "0.1em 0.4em" : 0,
  borderRadius: 2,
  whiteSpace: "pre",
});

const AnnotationShape: FC<{
  map: MapType;
  a: AnnotationDraft;
  scale: number;
  editing: boolean;
  selected: boolean;
  onPointerDown?: (e: ReactPointerEvent, mode: DragMode) => void;
}> = ({ map, a, scale, editing, selected, onPointerDown }) => {
  const [left, top] = toDisplay(map, a.x, a.y);
  const base: CSSProperties = {
    position: "absolute",
    left,
    top,
    boxSizing: "border-box",
    // 平常只是背景說明, 不擋地圖上的點位、車; 編輯時才拿得到滑鼠
    pointerEvents: editing ? "auto" : "none",
    cursor: editing ? "move" : undefined,
    // 平常排在底圖正上方 (DOM 順序), 點位、車都蓋在它上面
    zIndex: editing ? 150 : undefined,
    userSelect: "none",
    outline: selected ? `${2 / scale}px dashed #1677ff` : undefined,
    outlineOffset: selected ? 2 / scale : undefined,
  };
  const down = (mode: DragMode) => (e: ReactPointerEvent) =>
    onPointerDown?.(e, mode);

  if (a.kind === "text") {
    const stem = 22 / scale;
    const knob = 12 / scale;
    return (
      <div
        style={{
          ...base,
          ...textStyle(a),
          // 繞文字中心轉, (x, y) 仍是沒轉之前的左上角
          transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
          transformOrigin: "center",
        }}
        onPointerDown={down("move")}
        draggable={false}
      >
        {a.text}
        {selected ? (
          // 旋轉把手: 文字上方一根線加一個圓, 跟著文字一起轉
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: -stem - knob,
              width: knob,
              height: stem + knob,
              transform: "translateX(-50%)",
              cursor: "grab",
            }}
            data-annotation-rotate=""
            onPointerDown={(e) => {
              e.stopPropagation();
              down("rotate")(e);
            }}
          >
            <div
              style={{
                width: knob,
                height: knob,
                borderRadius: "50%",
                background: "#fff",
                border: `${1.5 / scale}px solid #1677ff`,
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                width: 1.5 / scale,
                height: stem,
                margin: "0 auto",
                background: "#1677ff",
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const [right, bottom] = toDisplay(map, a.x2 ?? a.x, a.y2 ?? a.y);
  const handle = 10 / scale;
  return (
    <div
      style={{
        ...base,
        left: Math.min(left, right),
        top: Math.min(top, bottom),
        width: Math.abs(right - left),
        height: Math.abs(bottom - top),
        border: `${a.borderWidth}px solid ${a.borderColor || "transparent"}`,
        background: a.fillColor || "transparent",
      }}
      onPointerDown={down("move")}
      draggable={false}
    >
      {a.text ? (
        <span
          style={{ position: "absolute", left: 0, top: 0, ...textStyle(a) }}
        >
          {a.text}
        </span>
      ) : null}
      {selected ? (
        <div
          style={{
            position: "absolute",
            right: -handle / 2,
            bottom: -handle / 2,
            width: handle,
            height: handle,
            background: "#fff",
            border: `${1 / scale}px solid #1677ff`,
            cursor: "nwse-resize",
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            down("resize")(e);
          }}
        />
      ) : null}
    </div>
  );
};

const AllAnnotations: FC<Props> = ({ scale, mapRef, mapImageRef }) => {
  const { t } = useTranslation();
  const { data } = useMap();
  const [messageApi, contextHolder] = message.useMessage();
  const panelOpen = useAtomValue(EditAnnotationSwitch);
  const showOnViewer = useAtomValue(isShowAnnotation);
  const editing = panelOpen && !!mapRef && !!mapImageRef;
  const [draft, setDraft] = useAtom(annotationDraftAtom);
  const [tool, setTool] = useAtom(annotationToolAtom);
  const style = useAtomValue(annotationStyleAtom);
  const setStyle = useSetAtom(annotationStyleAtom);

  // 拖曳中用 ref 拿最新值, 不必每動一下就重綁事件
  const latest = useRef({ draft, data, scale, style, tool });
  latest.current = { draft, data, scale, style, tool };

  /** 螢幕座標 -> 地圖座標 (公尺) */
  const toRos = (clientX: number, clientY: number) => {
    const map = latest.current.data;
    const img = mapImageRef?.current;
    if (!map || !img) return null;
    const rect = img.getBoundingClientRect();
    const [x, y] = rvizCoord({
      displayX: clientX - rect.left,
      displayY: clientY - rect.top,
      mapResolution: map.mapResolution,
      mapOriginX: map.mapOriginX,
      mapOriginY: map.mapOriginY,
      mapHeight: map.mapHeight,
      scaleSize: latest.current.scale,
    });
    return { x: round(x), y: round(y) };
  };

  /** 按住拖曳: 每次移動把「從按下到現在」的位移交給 onMove */
  const trackDrag = (
    start: { clientX: number; clientY: number },
    onMove: (dx: number, dy: number, distPx: number) => void,
    onEnd?: (distPx: number) => void,
  ) => {
    const res = latest.current.data?.mapResolution ?? 0.05;
    let dist = 0;
    const move = (e: PointerEvent) => {
      const s = latest.current.scale;
      const px = e.clientX - start.clientX;
      const py = e.clientY - start.clientY;
      dist = Math.hypot(px, py);
      // 螢幕往下 = 地圖 y 變小
      onMove((px / s) * res, (-py / s) * res, dist);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onEnd?.(dist);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // 新增文字 / 拉框: 在底圖上按下
  useEffect(() => {
    const panel = mapRef?.current;
    if (!editing || !panel || tool === "select") return;
    panel.style.cursor = "crosshair";

    const onDown = (e: PointerEvent) => {
      // 中鍵留給拖曳地圖
      if (e.button !== 0) return;
      const p = toRos(e.clientX, e.clientY);
      const { style: s, tool: currentTool } = latest.current;
      if (!p) return;
      e.preventDefault();
      if (currentTool === "text") {
        setDraft({
          id: null,
          rev: null,
          kind: "text",
          text: t("map_annotation.default_text"),
          x: p.x,
          y: p.y,
          x2: null,
          y2: null,
          rotation: 0,
          ...s,
        });
        setTool("select");
        return;
      }
      const startDraft: AnnotationDraft = {
        id: null,
        rev: null,
        kind: "rect",
        text: "",
        x: p.x,
        y: p.y,
        x2: p.x,
        y2: p.y,
        rotation: 0,
        ...s,
      };
      setDraft(startDraft);
      trackDrag(
        e,
        (dx, dy) =>
          setDraft({
            ...startDraft,
            x2: round(p.x + dx),
            y2: round(p.y + dy),
          }),
        (dist) => {
          if (dist < MIN_RECT_PX) {
            setDraft(null);
            return;
          }
          setDraft((d) => (d ? normalizeRect(d) : d));
          setTool("select");
        },
      );
    };

    panel.addEventListener("pointerdown", onDown);
    return () => {
      panel.removeEventListener("pointerdown", onDown);
      panel.style.cursor = "";
    };
  }, [editing, tool, mapRef]);

  // 關掉面板時把還沒存的草稿丟掉
  useEffect(() => {
    if (!panelOpen) {
      setDraft(null);
      setTool("select");
    }
  }, [panelOpen]);

  if (!data) return null;
  // 首頁 / 平板 (沒給 mapRef) 才看「顯示標註」開關; 設定頁一律顯示
  if (!mapRef && !showOnViewer) return null;
  const saved = data.annotations;

  const startDrag = (
    a: AnnotationDraft,
    e: ReactPointerEvent,
    mode: DragMode,
  ) => {
    if (!editing || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    // 換選另一個之前, 目前這個有沒存的修改就先擋下來, 免得默默丟掉
    if (draft && draft.id !== a.id) {
      if (isDraftDirty(draft, saved)) {
        void messageApi.warning(t("map_annotation.save_or_cancel_first"));
        return;
      }
    }
    const from: AnnotationDraft = draft && draft.id === a.id ? draft : a;
    setDraft(from);
    setStyle({
      fontSize: from.fontSize,
      color: from.color,
      backgroundColor: from.backgroundColor,
      borderColor: from.borderColor,
      fillColor: from.fillColor,
      borderWidth: from.borderWidth,
    });
    if (mode === "rotate") {
      // 文字中心 (轉過的元素, 外框中心還是同一點) 指向游標的角度; 把手朝上 = 0 度
      const box = (
        e.currentTarget.parentElement as HTMLElement
      ).getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const move = (ev: PointerEvent) => {
        let deg =
          (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
        if (deg > 180) deg -= 360;
        // 按住 Shift 每 15 度一格
        deg = ev.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        setDraft({ ...from, rotation: deg === -180 ? 180 : deg });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      return;
    }
    trackDrag(
      e,
      (dx, dy) =>
        setDraft(
          mode === "move"
            ? {
                ...from,
                x: round(from.x + dx),
                y: round(from.y + dy),
                x2: from.x2 == null ? null : round(from.x2 + dx),
                y2: from.y2 == null ? null : round(from.y2 + dy),
              }
            : {
                ...from,
                x2: round((from.x2 ?? from.x) + dx),
                y2: round((from.y2 ?? from.y) + dy),
              },
        ),
      () => setDraft((d) => (d ? normalizeRect(d) : d)),
    );
  };

  const shown: { a: AnnotationDraft; selected: boolean }[] = saved
    .filter((a) => !(editing && draft && draft.id === a.id))
    .map((a: Annotation) => ({ a: toDraft(a), selected: false }));
  if (editing && draft) shown.push({ a: draft, selected: true });

  return (
    <>
      {editing ? contextHolder : null}
      {shown.map(({ a, selected }) => (
        <AnnotationShape
          key={a.id ?? "__new__"}
          map={data}
          a={a}
          scale={scale}
          editing={editing && tool === "select"}
          selected={selected}
          onPointerDown={(e, mode) => startDrag(a, e, mode)}
        />
      ))}
    </>
  );
};

/** 地圖座標取到 0.001 m (跟點位一樣), 再細沒有意義 */
const round = (v: number) => Math.round(v * 1000) / 1000;

export default memo(AllAnnotations);
