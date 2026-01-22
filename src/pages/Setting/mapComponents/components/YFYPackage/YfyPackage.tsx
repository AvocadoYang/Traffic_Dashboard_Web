import useMap from "@/api/useMap";
import { nanoid } from "nanoid";
import { FC, memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { draggableLineInitialPoint } from "@/pages/Setting/hooks/hook";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import {
  EditRoadPanelSwitch,
  EditZoneSwitch,
  isShowLocation,
} from "@/utils/siderGloble";
import { DraggableLine, Point } from "../AllLocation/components/PointAndLine";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import styled, { keyframes, css } from "styled-components";

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

// Pulse animation for cargo
const pulseCargo = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 4px rgba(82, 196, 26, 0);
  }
`;

// Glow animation for empty slot
const glowEmpty = keyframes`
  0%, 100% {
    box-shadow: inset 0 0 8px rgba(140, 140, 140, 0.3);
  }
  50% {
    box-shadow: inset 0 0 12px rgba(140, 140, 140, 0.5);
  }
`;

const PackageLine = styled.div<{
  translate_x: number;
  translate_y: number;
  scale: number;
  rotate: number;
}>`
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  width: 540px;
  height: 30px;
  padding: 4px;
  border-radius: 6px;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  border: 2px solid #1a252f;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2);

  transform: ${(props) =>
    `translate(${props.translate_x}em, ${props.translate_y}em) scale(${props.scale}) rotate(${props.rotate}deg)`};

  transition: all 0.3s ease;
`;

const Items = styled.div<{
  $hasCargo: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  /* Use the css helper for conditional blocks containing animations */
  ${(props) =>
    props.$hasCargo
      ? css`
          background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
          color: #ffffff;
          border: 2px solid #389e0d;
          box-shadow:
            0 0 0 0 rgba(82, 196, 26, 0.7),
            inset 0 1px 2px rgba(255, 255, 255, 0.3);
          animation: ${pulseCargo} 2s ease-in-out infinite;

          &::before {
            content: "";
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            height: 40%;
            background: linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.4) 0%,
              transparent 100%
            );
            border-radius: 2px;
          }
        `
      : css`
          background: linear-gradient(135deg, #f5f5f5 0%, #d9d9d9 100%);
          color: #8c8c8c;
          border: 2px solid #bfbfbf;
          box-shadow: inset 0 0 8px rgba(140, 140, 140, 0.3);
          animation: ${glowEmpty} 3s ease-in-out infinite;

          &::after {
            content: "";
            position: absolute;
            inset: 4px;
            border: 1px dashed #bfbfbf;
            border-radius: 2px;
            opacity: 0.5;
          }
        `}

  /* Hover effect */
  &:hover {
    transform: translateY(-2px);
    ${(props) =>
      props.$hasCargo
        ? css`
            box-shadow:
              0 4px 8px rgba(82, 196, 26, 0.4),
              inset 0 1px 2px rgba(255, 255, 255, 0.3);
          `
        : css`
            box-shadow:
              0 2px 4px rgba(0, 0, 0, 0.1),
              inset 0 0 12px rgba(140, 140, 140, 0.4);
          `}
  }
`;

const fakeSignal = {
  1: true,
  2: false,
  3: true,
  4: true,
  5: true,
  6: false,
  7: true,
  8: false,
  9: true,
  10: false,
  11: true,
  12: false,
};

const YFYPackage: FC = () => {
  const showLocation = useAtomValue(isShowLocation);
  const setTooltip = useSetAtom(tooltipProp);
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

  const handleQuickRoad = (locationId: string) => {
    if (!quickRoad) return;
    // console.log("chick+++");
    setQuickRoadArr((prev) => [...prev, locationId]);
  };

  const handleEnter = useCallback(
    (locationId: string, x: number, y: number) => {
      setTooltip({
        x,
        y,
        locationId,
      });
    },
    [],
  );

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (!data || !showLocation) return;
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === "PACKAGE")
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

          return (
            <div
              draggable={false}
              key={loc.locationId}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              style={{ borderRadius: "50%" }}
              id={loc.locationId.toString()}
              onClick={() => {
                handleQuickRoad(loc.locationId);
              }}
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
                <PackageLine
                  translate_x={translateX}
                  translate_y={translateY}
                  rotate={rotate}
                  scale={LocScale}
                >
                  {Object.entries(fakeSignal).map(([key, hasCargo]) => (
                    <Items key={key} $hasCargo={hasCargo}>
                      {key}
                    </Items>
                  ))}
                </PackageLine>
              </WrapperStation>
            </div>
          );
        })}
    </>
  );
};

export default memo(YFYPackage);
