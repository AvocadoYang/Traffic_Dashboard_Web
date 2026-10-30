import { FC, RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useMap from "@/api/useMap";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { rvizCoord } from "@/utils/utils";
import { toOpaque } from "@/pages/Setting/mapComponents/components/AllZones/components/ZoneHoverCard";
import { GhostButton, SolidButton } from "../../ui/primitives";
import { c, font, space } from "../../ui/tokens";
import {
  ZoneRow,
  useZoneEditMutation,
  zoneEditPayload,
  zoneFormValues,
} from "./ZoneEditModal";

/** 拖不到這麼多螢幕像素就當作只是點一下, 不算框 */
const MIN_DRAG_PX = 4;

type Point = { x: number; y: number };
type Bounds = { startX: number; startY: number; endX: number; endY: number };

/** 拉出來的框, 座標是底圖像素 (跟著地圖平移縮放的那一層) */
const Frame = styled.div.attrs<{ $x: number; $y: number; $w: number; $h: number }>(
  ({ $x, $y, $w, $h }) => ({ style: { left: $x, top: $y, width: $w, height: $h } }),
)<{ $x: number; $y: number; $w: number; $h: number; $color: string }>`
  position: absolute;
  z-index: 100;
  box-sizing: border-box;
  pointer-events: none;
  border: 2px dashed ${({ $color }) => $color};
  background: color-mix(in srgb, ${({ $color }) => $color} 15%, transparent);
`;

const Bar = styled.div`
  position: fixed;
  z-index: 900;
  transform: translate(-50%, -100%);
  display: flex;
  align-items: center;
  gap: ${space.md};
  padding: ${space.sm} ${space.md};
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.text};
  background: ${c.bg};
  border: 1px solid ${c.borderStrong};
  white-space: nowrap;
`;

const round3 = (n: number) => Number(n.toFixed(3));

type Props = {
  /** 要重畫邊界的區域; null 就是沒在重畫 */
  zone: ZoneRow | null;
  onClose: () => void;
  /** 地圖外框: 在上面按下開始拉框, 提示列也對齊它的底部 */
  wrapRef: RefObject<HTMLDivElement>;
  /** 底圖: 拿它的位置把滑鼠座標換成底圖像素 */
  mapImageRef: RefObject<HTMLImageElement>;
  scale: number;
};

/**
 * 在地圖上拖曳重新框出某個區域的範圍。放開後按儲存才寫回後端, 其他設定 (名稱、類型、層級…) 不動。
 * 要放在 CanvasMap 的 overlay 裡: 框是用底圖像素畫的。
 */
const ZoneRedraw: FC<Props> = ({ zone, onClose, wrapRef, mapImageRef, scale }) => {
  const { t } = useTranslation();
  const { data: mapData } = useMap();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const [messageApi, contextHolder] = message.useMessage();
  const mutation = useZoneEditMutation(messageApi, onClose);

  const [frame, setFrame] = useState<{ start: Point; end: Point } | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  // 換一個區域重畫, 上一個拉的框不能留著
  useEffect(() => {
    setFrame(null);
    setBounds(null);
  }, [zone]);

  useEffect(() => {
    if (!zone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zone, onClose]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!zone || !wrap || !mapData) return;

    const toImage = (e: MouseEvent): Point | null => {
      const img = mapImageRef.current;
      if (!img) return null;
      const r = img.getBoundingClientRect();
      return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
    };
    const toRos = (p: Point) =>
      rvizCoord({
        displayX: p.x,
        displayY: p.y,
        mapResolution: mapData.mapResolution,
        mapOriginX: mapData.mapOriginX,
        mapOriginY: mapData.mapOriginY,
        mapHeight: mapData.mapHeight,
        scaleSize: 1,
      });

    let start: Point | null = null;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const p = toImage(e);
      if (!p) return;
      e.preventDefault();
      start = p;
      setBounds(null);
      setFrame({ start: p, end: p });
    };
    const onMove = (e: MouseEvent) => {
      if (!start) return;
      const p = toImage(e);
      if (p) setFrame({ start: start, end: p });
    };
    const onUp = (e: MouseEvent) => {
      if (!start) return;
      const s = start;
      start = null;
      const p = toImage(e);
      if (
        !p ||
        Math.abs(p.x - s.x) * scale < MIN_DRAG_PX ||
        Math.abs(p.y - s.y) * scale < MIN_DRAG_PX
      ) {
        setFrame(null);
        return;
      }
      setFrame({ start: s, end: p });
      const [startX, startY] = toRos(s);
      const [endX, endY] = toRos(p);
      setBounds({
        startX: round3(startX),
        startY: round3(startY),
        endX: round3(endX),
        endY: round3(endY),
      });
    };

    wrap.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      wrap.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [zone, wrapRef, mapImageRef, scale, mapData]);

  if (!zone) return null;

  const save = () => {
    if (!bounds) return;
    mutation.mutate(
      zoneEditPayload(zone, { ...zoneFormValues(zone), ...bounds }, currentMapId),
    );
  };

  const wrapRect = wrapRef.current?.getBoundingClientRect();

  return (
    <>
      {contextHolder}
      {frame ? (
        <Frame
          $x={Math.min(frame.start.x, frame.end.x)}
          $y={Math.min(frame.start.y, frame.end.y)}
          $w={Math.abs(frame.end.x - frame.start.x)}
          $h={Math.abs(frame.end.y - frame.start.y)}
          $color={toOpaque(zone.backgroundColor)}
        />
      ) : null}
      {/* overlay 那層有 transform, fixed 會跑掉, 提示列掛到 body 上 */}
      {wrapRect
        ? createPortal(
            <Bar
              style={{
                left: wrapRect.left + wrapRect.width / 2,
                top: wrapRect.bottom - 16,
              }}
            >
              <span>
                {t(
                  bounds
                    ? "setting_v2.zone.redraw_ready"
                    : "setting_v2.zone.redraw_hint",
                  { name: zone.name },
                )}
              </span>
              <SolidButton
                onClick={save}
                disabled={!bounds || mutation.isLoading}
              >
                <SaveOutlined />
                {t("utils.save")}
              </SolidButton>
              <GhostButton onClick={onClose}>{t("utils.cancel")}</GhostButton>
            </Bar>,
            document.body,
          )
        : null}
    </>
  );
};

export default ZoneRedraw;
