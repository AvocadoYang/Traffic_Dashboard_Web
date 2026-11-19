import { memo } from "react";
import styled from "styled-components";

// 判斷 MiR 地點類型的常數和函式在 @/utils/map/areaTypes

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
