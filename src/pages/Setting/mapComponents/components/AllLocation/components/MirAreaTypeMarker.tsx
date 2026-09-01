import { memo } from "react";
import styled from "styled-components";

// MiR 風格打點新增的獨立地點類型,用實際的 PNG 圖示(放在 dashboard
// public/ 底下,檔名就是 areaType 字串)取代其他類型用的純色圓點。
// 新增類型時:這裡加一筆、public/ 放同名 PNG,再到 MirStyleLocationPlacer 的
// TYPE_OPTIONS 與 setting/utils/func.ts 補上。PNG 有兩個約定要先確認,不然
// 尺寸或角度會跟其他標記對不起來:
//   1. 裁掉透明留白、圖案本體填滿整張正方形畫布(留白會讓圖看起來偏小)。
//   2. 朝向要畫成「rotation=0 時指向右邊」——三角形/箭頭指右。素材若是
//      指下或指上,轉出來就會固定差 90 度,要先把圖轉正而不是在程式裡補償。
export const MIR_AREA_TYPES = new Set([
  "MIR_ROBOT_POSITION",
  "MIR_SHELF_POSITION",
  "MIR_CHARGING_STATION",
  "MIR_VL_MARKER",
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
