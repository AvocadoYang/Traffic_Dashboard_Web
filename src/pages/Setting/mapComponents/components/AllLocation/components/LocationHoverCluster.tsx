import { FC, memo, useMemo } from "react";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import useMap from "@/api/useMap";
import { locationHoverInfo, tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { HoverLabel, TOOLTIP_Z_INDEX } from "../../HoverLabel";

// 圍繞游標排列的最小半徑，以及每個標籤沿圓周需要的最小弧長(px)。
// 點位越密集，圓周需要的周長越長，因此半徑會隨數量增加，確保標籤彼此不重疊。
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
  animation: locationHoverIn 0.12s ease-out;

  @keyframes locationHoverIn {
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

const LocationHoverCluster: FC = () => {
  const hoverInfo = useAtomValue(locationHoverInfo);
  const exactHover = useAtomValue(tooltipProp);
  const { data } = useMap();

  // 用 Map 建索引，只在 data 變動時建一次，
  // 讓每次游標移動時的點位查找是 O(1) 而不是重新掃過整份點位清單。
  const locationById = useMemo(
    () => new Map(data?.locations.map((loc) => [loc.locationId.toString(), loc])),
    [data],
  );

  const items = useMemo(() => {
    if (!hoverInfo || !data || hoverInfo.locationIds.length === 0) return [];

    // 精確 hover 到某個點位時，該點位已經有自己的單一標籤(見 ToolTip.tsx)，
    // 這時附近的其他標籤全部隱藏，只留下精確 hover 的那一個。
    if (exactHover) return [];

    const { x: cx, y: cy, locationIds } = hoverInfo;
    const total = locationIds.length;
    const radius =
      total === 1
        ? SINGLE_RADIUS
        : Math.max(MIN_RADIUS, (total * ARC_PER_LABEL) / (2 * Math.PI));

    return locationIds.reduce<
      { locationId: string; pointX: number; pointY: number; labelX: number; labelY: number }[]
    >((acc, locationId, index) => {
      const loc = locationById.get(locationId);
      if (!loc) return acc;

      const [pointX, pointY] = rosCoord2DisplayCoord({
        x: loc.x,
        y: loc.y,
        mapHeight: data.mapHeight,
        mapOriginX: data.mapOriginX,
        mapOriginY: data.mapOriginY,
        mapResolution: data.mapResolution,
      });

      const angle =
        total === 1 ? -Math.PI / 2 : (2 * Math.PI * index) / total - Math.PI / 2;
      const labelX = cx + radius * Math.cos(angle);
      const labelY = cy + radius * Math.sin(angle);

      acc.push({ locationId, pointX, pointY, labelX, labelY });
      return acc;
    }, []);
  }, [hoverInfo, exactHover, data, locationById]);

  if (items.length === 0) return null;

  return (
    <>
      <Svg>
        {items.map((item) => (
          <line
            key={item.locationId}
            x1={item.pointX}
            y1={item.pointY}
            x2={item.labelX}
            y2={item.labelY}
            stroke="rgba(24, 144, 255, 0.55)"
            strokeWidth={1.25}
            strokeDasharray="2 3"
          />
        ))}
      </Svg>
      {items.map((item) => (
        <LabelWrapper key={item.locationId} x={item.labelX} y={item.labelY}>
          <HoverLabel $accent="blue">{item.locationId}</HoverLabel>
        </LabelWrapper>
      ))}
    </>
  );
};

export default memo(LocationHoverCluster);
