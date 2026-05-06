import useMap from "@/api/useMap";
import {
  TempStoredLocationsForQuickEditPanel,
  tooltipProp,
} from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { useAtom, useSetAtom } from "jotai";
import { FC, memo, useEffect } from "react";
import { nanoid } from "nanoid";
import styled from "styled-components";

const PointDiv = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
  hoverLoc?: boolean;
}>(({ left, top, canrotate, hoverLoc }) => ({
  style: { left, top, canrotate, hoverLoc },
}))<{
  left: number;
  top: number;
  canrotate: string;
  hoverLoc?: boolean;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
  background: green;
  border-radius: 50%;
  z-index: 10;
  transition-duration: 200ms;

  border: ${(props) => (props.hoverLoc ? "5px solid orange" : "none")};
  &:hover {
    background: green;
    scale: 1.8;
  }
`;

export const Point = memo(PointDiv);

const TempLocations: FC = () => {
  const [tempStoredLocationsForQuickEditPanel] = useAtom(
    TempStoredLocationsForQuickEditPanel,
  );
  const { data } = useMap();
  const setTooltip = useSetAtom(tooltipProp);
  const handleEnter = (locationId: string, x: number, y: number) => {
    setTooltip({
      x,
      y,
      locationId,
    });
  };

  const handleLeave = () => {
    setTooltip(null);
  };

  useEffect(() => {}, [tempStoredLocationsForQuickEditPanel]);

  if (!tempStoredLocationsForQuickEditPanel.length || !data) return null;

  return (
    <>
      {tempStoredLocationsForQuickEditPanel.map((loc) => {
        const [displayX, displayY] = rosCoord2DisplayCoord({
          x: loc.x,
          y: loc.y,
          mapHeight: data?.mapHeight,
          mapOriginX: data?.mapOriginX,
          mapOriginY: data.mapOriginY,
          mapResolution: data.mapResolution,
        });
        return (
          <div
            draggable={false}
            key={loc.locationId}
            onDragStart={(event) => {
              event.preventDefault();
            }}
            style={{ borderRadius: "50%" }}
          >
            <Point
              id={loc.locationId.toString()}
              canrotate={`${loc.canRotate}`}
              left={displayX}
              top={displayY}
              key={nanoid()}
              onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
              onMouseLeave={() => handleLeave()}
            ></Point>
          </div>
        );
      })}
    </>
  );
};

export default memo(TempLocations);
