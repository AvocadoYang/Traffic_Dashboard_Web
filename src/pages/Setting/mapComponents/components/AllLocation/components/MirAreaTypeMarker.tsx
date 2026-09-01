import { memo } from "react";
import styled from "styled-components";

// MiR 風格打點新增的三個獨立地點類型,用實際的 PNG 圖示(放在 dashboard
// public/ 底下,檔名就是 areaType 字串)取代其他類型用的純色圓點。
export const MIR_AREA_TYPES = new Set([
  "MIR_ROBOT_POSITION",
  "MIR_SHELF_POSITION",
  "MIR_CHARGING_STATION",
]);

export const isMirAreaType = (areaType: string) => MIR_AREA_TYPES.has(areaType);

const MarkerImg = styled.img.attrs<{
  left: number;
  top: number;
  rotation: number;
}>(({ left, top, rotation }) => ({
  style: {
    left: Math.round(left),
    top: Math.round(top),
    transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
  },
}))<{ left: number; top: number; rotation: number }>`
  position: absolute;
  width: 22px;
  height: 22px;
  object-fit: contain;
  cursor: pointer;
  z-index: 20;
  transform-origin: center;
`;

const MirAreaTypeMarkerBase: React.FC<{
  areaType: string;
  left: number;
  top: number;
  rotation?: number;
  id?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({ areaType, left, top, rotation, ...handlers }) => (
  <MarkerImg
    src={`/${areaType}.png`}
    left={left}
    top={top}
    rotation={rotation ?? 0}
    draggable={false}
    onDragStart={(e) => e.preventDefault()}
    {...handlers}
  />
);

export const MirAreaTypeMarker = memo(MirAreaTypeMarkerBase);
