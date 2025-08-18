import { FC, useMemo } from "react";
import useMap from "@/api/useMap";
import Icon from "./Icon";

import "../style.css";
import { useAmrPose } from "@/sockets/useAMRInfo";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { amrId2ColorRainbow } from "@/utils/utils";
import { AmrFilterCarCard, hintAmr, showZoneForbidden } from "@/utils/gloable";
import { useWarningId } from "@/sockets/useWarning";

const Tip = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: {
    transform: `translate(-42%, -160%) `,
    left,
    top,
    transition: "x 1s, y 1s",
  },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  display: flex;
  padding: 2px;
  align-items: center;
  justify-content: center;
  height: 20px;
  width: 130px;
  font-size: 0.7em;
  background-color: rgba(0, 0, 0, 0.75);
  border-radius: 5px;
  z-index: 100;
  color: #fafafa;
  font-weight: bold;

  &::after {
    content: "";
    position: absolute;
    bottom: -9px; /* 調整三角形位置 */
    left: 50%;
    z-index: 99;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.65) transparent transparent transparent;
  }
`;

const ErrorTip = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: {
    transform: `translate(-42%, -160%) `,
    left,
    top,
    transition: "x 1s, y 1s",
  },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  display: flex;
  padding: 2px;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  background-color: rgba(252, 252, 252, 0.75);
  z-index: 50;
  color: #fafafa;
  font-weight: bold;
`;

const agvFormate = (x1: number, y1: number) => {
  const theta = (3 * Math.PI) / 2;
  const x = x1 * Math.cos(theta) - y1 * Math.sin(theta);
  const y = x1 * Math.sin(theta) + y1 * Math.cos(theta);

  return { x, y };
};

const AMR: FC<{
  amrId: string;
}> = ({ amrId }) => {
  const { data: map } = useMap();
  const color = amrId2ColorRainbow(amrId);
  const hintAmrId = useAtomValue(hintAmr);
  const hintAmrId2 = useAtomValue(AmrFilterCarCard);
  const zoneForbidden = useAtomValue(showZoneForbidden);
  const errorMessage = useWarningId()?.get(amrId);

  const isForbidden = useMemo(() => {
    return zoneForbidden.has(amrId);
  }, [zoneForbidden]);

  const showTooltip = useMemo(() => {
    return (
      hintAmrId2.has(amrId) || hintAmrId === amrId || zoneForbidden.has(amrId)
    );
  }, [hintAmrId2, hintAmrId, zoneForbidden]);

  const { pose } = useAmrPose(amrId);
  if (!pose || !map) return null;

  const { x: newX, y: newY } = agvFormate(pose.x, pose.y);
  const [left, top] = rosCoord2DisplayCoord({
    x: amrId.includes("SW15") ? newX + 3.5 : pose.x,
    y: amrId.includes("SW15") ? newY + 0.4 : pose.y,
    mapResolution: map.mapResolution,
    mapOriginX: map.mapOriginX,
    mapOriginY: map.mapOriginY,
    mapHeight: map.mapHeight,
  });

  // 會一直被渲染是正常的 不要包memo
  return (
    <>
      {showTooltip ? (
        <Tip left={left} top={top}>
          <p>{`${isForbidden ? "🚫 " : ""}${amrId}`}</p>
          {/* <ArrowDownOutlined className="hint-icon" /> */}
        </Tip>
      ) : (
        []
      )}

      <Icon amrId={amrId} color={color} left={left} top={top}></Icon>
      {errorMessage?.length ? (
        <ErrorTip left={left} top={top + Math.sqrt(top) - 5}>
          ❗
        </ErrorTip>
      ) : null}
    </>
  );
};
export default AMR;
