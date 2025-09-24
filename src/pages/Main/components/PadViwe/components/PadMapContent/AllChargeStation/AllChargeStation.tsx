import useMap from "@/api/useMap";
import { nanoid } from "nanoid";
import { FC, memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { isShowLocation } from "@/utils/siderGloble";
import useLoc, { LocWithoutArr } from "@/api/useLoc";

import styled from "styled-components";
import ChargeStation from "./ChargeStation";
import { Point } from "@/pages/Setting/mapComponents/components/AllLocation/components/PointAndLine";
import StatusPanel from "./StatusPanel";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";

const WrapperStation = styled.div.attrs<{
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

const AllChargeStation: FC = () => {
  const showLocation = useAtomValue(isShowLocation);
  const setTooltip = useSetAtom(tooltipProp);
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const charSocket = useChargeStationSocket();

  const handleEnter = useCallback(
    (locationId: string, x: number, y: number) => {
      setTooltip({
        x,
        y,
        locationId,
      });
    },
    []
  );

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (!data || !showLocation || !charSocket) return;
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "CHARGING")
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

          const translateX =
            info?.find((i) => i.locationId === loc.locationId)?.translateX || 0;
          const translateY =
            info?.find((i) => i.locationId === loc.locationId)?.translateY || 0;
          const rotate =
            info?.find((i) => i.locationId === loc.locationId)?.rotate || 270;
          const LocScale =
            info?.find((i) => i.locationId === loc.locationId)?.scale || 1;

          const booker = charSocket[loc.locationId]?.booker || false;

          return (
            <div
              draggable={false}
              key={loc.locationId}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              style={{ borderRadius: "50%" }}
              id={loc.locationId.toString()}
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

              <WrapperStation left={displayX} top={displayY}>
                <ChargeStation
                  locationId={loc.locationId}
                  isAlive={true}
                  booker={booker}
                  isDisable={false}
                  customName={""}
                  translateX={translateX}
                  translateY={translateY}
                  rotate={rotate}
                  scale={LocScale}
                />
              </WrapperStation>
            </div>
          );
        })}
    </>
  );
};

export default memo(AllChargeStation);
