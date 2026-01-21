import useMap from "@/api/useMap";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { memo } from "react";
import Cargo from "./Cargo";
import { tooltipProp } from "@/utils/gloable";
import { useAtomValue, useSetAtom } from "jotai";
import { isShowLocation } from "@/utils/siderGloble";
import { Point } from "../AllLocation/components/PointAndLine";
import { nanoid } from "nanoid";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import useCargoInfo from "@/sockets/useCargoInfo";
import styled from "styled-components";

const WrapperForCargo = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: { left, top },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
`;

const AllCargo: React.FC = () => {
  const setTooltip = useSetAtom(tooltipProp);
  const shelfInfo = useCargoInfo();
  const showLocation = useAtomValue(isShowLocation);
  const { data } = useMap();

  const { data: locInfo } = useLoc(undefined);
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
  if (!data || !showLocation) return;
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "STORAGE")
        .map((loc) => {
          const [displayX, displayY] = rosCoord2DisplayCoord({
            x: loc.x,
            y: loc.y,
            mapHeight: data?.mapHeight,
            mapOriginX: data?.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
          });

          const info = locInfo as LocWithoutArr[];

          const translateX = info?.find((i) => i.locationId === loc.locationId)
            ?.translateX as number;
          const translateY = info?.find((i) => i.locationId === loc.locationId)
            ?.translateY as number;
          const rotate = info?.find((i) => i.locationId === loc.locationId)
            ?.rotate as number;
          const LocScale = info?.find((i) => i.locationId === loc.locationId)
            ?.scale as number;
          const flex_direction = info?.find(
            (i) => i.locationId === loc.locationId,
          )?.flex_direction as string;
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
              <WrapperForCargo left={displayX} top={displayY}>
                <Cargo
                  id={loc.id}
                  locId={loc.locationId}
                  translateX={translateX}
                  translateY={translateY}
                  scale={LocScale}
                  rotate={rotate}
                  flex_direction={flex_direction}
                  shelfInfo={shelfInfo?.[loc.locationId] || undefined}
                />
              </WrapperForCargo>
            </div>
          );
        })}
    </>
  );
};

export default memo(AllCargo);
