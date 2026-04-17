import useMap from "@/api/useMap";
import { nanoid } from "nanoid";
import { FC, memo, useCallback, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { isShowLocation } from "@/utils/siderGloble";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import styled, { keyframes, css } from "styled-components";
import {
  useRemoteIo31,
  useRemoteIo32,
  useRemoteIo33,
  useRemoteIo34,
} from "@/sockets/useRemoteIo";

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

const Point = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
}>(({ left, top, canrotate }) => ({
  style: { left, top, canrotate },
}))<{
  left: number;
  top: number;
  canrotate: string;
}>`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${(props) =>
    props.canrotate === "true" ? "#86c959" : "#f5ae07"};
  position: absolute;
  left: ${(p) => p.left}px;
  top: ${(p) => p.top}px;
  z-index: 300000;
  box-shadow: 0 0 4px rgba(245, 129, 20, 0.6);
  transform: translate(-50%, -50%);
  &:hover {
    background: red;
    width: 5px;
    height: 5px;
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

const YFYPackage: FC = () => {
  const showLocation = useAtomValue(isShowLocation);
  const setTooltip = useSetAtom(tooltipProp);
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);
  const io31 = useRemoteIo31(); // [bool1, _, bool2, bool3, ...]
  const io32 = useRemoteIo32(); // [bool4, bool5, bool6, bool7, bool8, bool9, bool10, bool11]
  const io33 = useRemoteIo33(); // [bool12, bool13, bool14, bool15, bool16, bool17, bool18, bool19]
  const io34 = useRemoteIo34(); // [bool20, bool21, ...]

  const realSignals = useMemo(() => {
    const s31 = io31.states || [];
    const s32 = io32.states || [];
    const s33 = io33.states || [];
    const s34 = io34.states || [];

    return {
      //  [bool1, _, bool2, bool3, _, _, _, _]
      1: !!s31[0],
      2: !!s31[2],
      3: !!s31[3],

      // [bool4, bool5, bool6, bool7, bool8, bool9, bool10, bool11]
      4: !!s32[0],
      5: !!s32[1],
      6: !!s32[2],
      7: !!s32[3],
      8: !!s32[4],
      9: !!s32[5],
      10: !!s32[6],
      11: !!s32[7],

      // [bool12, bool13, bool14, bool15, bool16, bool17, bool18, bool19]
      12: !!s33[0],
      13: !!s33[1],
      14: !!s33[2],
      15: !!s33[3],
      16: !!s33[4],
      17: !!s33[5],
      18: !!s33[6],
      19: !!s33[7],

      //  [bool20, bool21, ...]
      20: !!s34[0],
    };
  }, [io31.states, io32.states, io33.states, io34.states]);

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
                  {Object.entries(realSignals).map(([key, hasCargo]) => (
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
