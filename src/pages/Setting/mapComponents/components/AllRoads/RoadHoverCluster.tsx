import { FC, memo, useMemo } from "react";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import useMap from "@/api/useMap";
import { hoverRoad, roadHoverInfo } from "@/utils/gloable";
import { rosCoord2DisplayCoord, closestPointOnSegment } from "@/utils/utils";
import { HoverLabel, TOOLTIP_Z_INDEX } from "../HoverLabel";

// 圍繞游標排列的最小半徑，以及每個標籤沿圓周需要的最小弧長(px)。
// 路徑越密集，圓周需要的周長越長，因此半徑會隨數量增加，確保標籤彼此不重疊。
const MIN_RADIUS = 50;
const SINGLE_RADIUS = 34;
const ARC_PER_LABEL = 44;

const Svg = styled.svg`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  z-index: ${TOOLTIP_Z_INDEX - 1};
`;

const LabelWrapper = styled.div.attrs<{ x: number; y: number }>(
  ({ x, y }) => ({
    style: { left: `${x}px`, top: `${y}px` },
  }),
)<{ x: number; y: number }>`
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: ${TOOLTIP_Z_INDEX};
  pointer-events: none;
  animation: roadHoverIn 0.12s ease-out;

  @keyframes roadHoverIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.7);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
`;

const RoadHoverCluster: FC = () => {
  const hoverInfo = useAtomValue(roadHoverInfo);
  const exactHoverRoadId = useAtomValue(hoverRoad);
  const { data } = useMap();

  // 用 Map 建索引，只在 data 變動時建一次，
  // 讓每次游標移動時的路徑查找是 O(1) 而不是重新掃過整份路徑清單。
  const roadById = useMemo(
    () => new Map(data?.roads.map((road) => [road.roadId, road])),
    [data],
  );

  const items = useMemo(() => {
    if (!hoverInfo || !data || hoverInfo.roadIds.length === 0) return [];

    // 精確 hover 到某條路徑時，該路徑已經有自己的單一標籤(見 Road.tsx)，
    // 這時附近的其他標籤全部隱藏，只留下精確 hover 的那一個。
    if (exactHoverRoadId) return [];

    const { x: cx, y: cy, roadIds } = hoverInfo;
    const total = roadIds.length;
    const radius =
      total === 1
        ? SINGLE_RADIUS
        : Math.max(MIN_RADIUS, (total * ARC_PER_LABEL) / (2 * Math.PI));

    return roadIds.reduce<
      { roadId: string; anchorX: number; anchorY: number; labelX: number; labelY: number }[]
    >((acc, roadId, index) => {
      const road = roadById.get(roadId);
      if (!road) return acc;

      const [x1, y1] = rosCoord2DisplayCoord({
        x: road.x1,
        y: road.y1,
        mapHeight: data.mapHeight,
        mapOriginX: data.mapOriginX,
        mapOriginY: data.mapOriginY,
        mapResolution: data.mapResolution,
      });
      const [x2, y2] = rosCoord2DisplayCoord({
        x: road.x2,
        y: road.y2,
        mapHeight: data.mapHeight,
        mapOriginX: data.mapOriginX,
        mapOriginY: data.mapOriginY,
        mapResolution: data.mapResolution,
      });

      // 取路徑上離游標最近的點作為連接線的錨點，讓標籤指向的路段一目瞭然。
      const { x: anchorX, y: anchorY } = closestPointOnSegment(cx, cy, x1, y1, x2, y2);

      const angle =
        total === 1 ? -Math.PI / 2 : (2 * Math.PI * index) / total - Math.PI / 2;
      const labelX = cx + radius * Math.cos(angle);
      const labelY = cy + radius * Math.sin(angle);

      acc.push({ roadId, anchorX, anchorY, labelX, labelY });
      return acc;
    }, []);
  }, [hoverInfo, exactHoverRoadId, data, roadById]);

  if (items.length === 0) return null;

  return (
    <>
      <Svg>
        {items.map((item) => (
          <line
            key={item.roadId}
            x1={item.anchorX}
            y1={item.anchorY}
            x2={item.labelX}
            y2={item.labelY}
            stroke="rgba(255, 77, 79, 0.6)"
            strokeWidth={1.25}
            strokeDasharray="2 3"
          />
        ))}
      </Svg>
      {items.map((item) => (
        <LabelWrapper key={item.roadId} x={item.labelX} y={item.labelY}>
          <HoverLabel $accent="red">{item.roadId}</HoverLabel>
        </LabelWrapper>
      ))}
    </>
  );
};

export default memo(RoadHoverCluster);
