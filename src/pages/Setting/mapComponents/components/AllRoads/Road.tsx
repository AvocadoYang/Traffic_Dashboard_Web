import { FC, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { useAtomValue } from "jotai";
import { Tooltip } from "antd";
import { rad2Deg } from "@/utils/utils";
import { isShowRoadTooltip } from "@/utils/siderGloble";
import { useMockInfo } from "@/sockets/useMockInfo";

const Container = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({ style: { left, top } }))<{
  left: number;
  top: number;
}>`
  position: absolute;
`;

const Line1 = styled.div<{
  x: number;
  y: number;
  length: number;
  angle: number;
}>`
  position: absolute;
  left: ${(p) => p.x}px;
  top: ${(p) => p.y}px;
  width: ${(p) => p.length}px;
  height: 2px;
  background: #ff4d4f;
  transform-origin: 0 0;
  transform: rotate(${(p) => p.angle}deg);
  z-index: 300000;
`;

const LineBetweenTwoPoints: FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}> = ({ x1, y1, x2, y2 }) => {
  // 計算距離
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  // 計算旋轉角度
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return <Line1 x={x1} y={y1} length={length} angle={angle} />;
};
//#9cb4c8 #02ddff
const Line = styled.div.attrs<{
  length: number;
  angle: number;
  color: string;
  priority: number;
  $isOneWayRoad: boolean;
  $isClaimed: boolean;
  $limit: boolean;
  $isOnHover: boolean;
}>(
  ({
    length,
    angle,
    $isOneWayRoad,
    $isClaimed,
    $isOnHover,
    color,
    priority,
  }) => ({
    style: {
      width: length,
      height: $isOnHover ? "2px" : "1px",
      transform: `rotate(${angle}deg) translateY(-50%)`,
      backgroundColor: $isOneWayRoad ? "#ffffff5" : "rgb(0 68 255 / 0%)",
      opacity: "0.7",
      border:
        $isClaimed || $isOnHover
          ? `0.5px solid ${color}`
          : `${priority === 1 ? "0.5px solid #f74f8746" : "0.5px solid #9cb4c8"}`,
    },
  }),
)<{
  length: number;
  angle: number;
  $isOneWayRoad: boolean;
  $isClaimed: boolean;
  $limit: boolean;
  $isOnHover: boolean;
}>`
  height: 4px;
  transform-origin: top left;

  cursor: pointer;

  :hover {
    height: 6px;
  }

  ${({ $isOneWayRoad }) =>
    $isOneWayRoad &&
    css`
      ::before {
        content: "";
        display: block;
        left: 0px;
        position: absolute;
      }
      ::before {
        border-style: solid;
        border-width: 2px 2px 0 0;
        border-color: #f0c381;
        height: 5px;
        margin-top: -3.2px;
        margin-left: 50%;
        width: 5px;
        transform: rotate(45deg);
      }
    `}
`;

const Road: FC<{
  roadId: string;
  roadType: "oneWayRoad" | "twoWayRoad";
  x1: number; // in pixel, css coordinate
  y1: number; // in pixel, css coordinate
  x2: number; // in pixel, css coordinate
  y2: number; // in pixel, css coordinate
  validYawList: "*" | number[];
  priority: number;
  disabled: boolean;
  isClaimedBy?: string;
  limit: boolean;
  isRoadOnHover: boolean;
}> = ({
  roadId,
  roadType,
  x1,
  y1,
  x2,
  y2,
  isClaimedBy,
  limit,
  disabled,
  isRoadOnHover,
  priority,
}) => {
  const ref = useRef(null);

  const [simulateColor, setSimulateColor] = useState("#ff9646");
  const length = Math.hypot(x1 - x2, y1 - y2);
  const angle = rad2Deg(Math.atan2(y2 - y1, x2 - x1));
  const script = useMockInfo();
  const showRoadTooltip = useAtomValue(isShowRoadTooltip);

  useEffect(() => {
    if (!script) return;
    if (script.isSimulate) {
      setSimulateColor("#7ca1ea");
    } else {
      setSimulateColor("#ff9646");
    }
  }, [script]);

  return (
    <Container left={x1} top={y1}>
      <Tooltip title={showRoadTooltip ? roadId : ""}>
        <Line
          length={length}
          angle={angle}
          ref={ref}
          priority={priority}
          color={simulateColor}
          $isOneWayRoad={roadType === "oneWayRoad"}
          $isClaimed={isClaimedBy !== undefined}
          $limit={!!limit}
          $isOnHover={isRoadOnHover}
        >
          {disabled && (
            <p
              style={{
                fontSize: "10px",
                position: "absolute",
                top: "-px",
                // bottom: '10p%',
                left: "23%",
                zIndex: "100",
                transform: `rotate(-${angle}deg) translateY(-25%) translateX(20%)`,
              }}
            >
              ⛔
            </p>
          )}
          {limit && (
            <p
              style={{
                fontSize: "10px",
                position: "absolute",
                top: "-px",
                // bottom: '10p%',
                left: "23%",
                zIndex: "100",
                transform: `rotate(-${angle}deg) translateY(-25%) translateX(20%)`,
              }}
            >
              ❶
            </p>
          )}
        </Line>
      </Tooltip>
    </Container>
  );
};

export default Road;
