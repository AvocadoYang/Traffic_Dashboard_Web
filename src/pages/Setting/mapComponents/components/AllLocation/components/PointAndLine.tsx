import styled from "styled-components";
import { FC, memo, useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import { DragLineInfo, showBlockId as ShowBlockId } from "@/utils/gloable";
import { EditRoadPanelSwitch } from "@/utils/siderGloble";

const LabelWrapperDiv = styled.div.attrs<{ x: number; y: number }>(({ x, y }) => ({
  style: {
    left: x + "px",
    top: y + "px",
    transform: `translate(-50%, -50%)`,
  },
}))`
  position: absolute;
  z-index: 100;
  cursor: pointer;
  display: inline-block;

  &:hover > .tooltip {
    opacity: 1;
    transform: translateX(10px); /* 往右滑出 */
    pointer-events: auto;
  }
`;
export const LabelWrapper = memo(LabelWrapperDiv);

const LabelDiv = styled.div`
  font-size: 10px;
  padding: 2px 6px;
  background: white;
  border: 1px solid black;
  border-radius: 4px;
  z-index: 102;
  white-space: nowrap;
  pointer-events: auto;
  transition: background 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: rgba(0, 123, 255, 0.85);
    color: white;
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }
`;
export const Label = memo(LabelDiv);

const TooltipDiv = styled.div`
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateX(0) translateY(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 4px 8px;
  z-index: 104;
  font-size: 9px;
  border-radius: 4px;
  /* white-space: nowrap; */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  margin-left: 6px; /* 與 Label 保持距離 */
`;

export const LabelTooltip = memo(TooltipDiv);




const LineDiv = styled.div.attrs<{ x: number; y: number; angle: number; progress: number }>(
  ({ x, y, angle, progress }) => ({
    style: {
      left: x + "px",
      top: y + "px",
      // width: length + "px",
      transform: `rotate(${angle}deg) scaleX(${progress})`,
    },
  })
)`
position: absolute;
  transform-origin: 0 0;
  transform: translate(-50%, -50%);
  width: 60px;   /* 真寬 */
  height: 2px;
  opacity: 0.5;
  z-index: 95;
  transition: transform 0.45s cubic-bezier(.2,.8,.3,1);
  background: rgba(0, 0, 0, 0.45);
`;

export const Line = memo(LineDiv);


const PointDiv = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
  hoverLoc?: boolean;
  isNear?: boolean;
}>(({ left, top, canrotate, hoverLoc }) => ({
  // 位置四捨五入到整數像素，避免小圓點在縮放後落在次像素造成
  // 各點抗鋸齒程度不同、視覺上大小看起來不一致。
  style: { left: Math.round(left), top: Math.round(top), canrotate, hoverLoc },
}))<{
  left: number;
  top: number;
  canrotate: string;
  hoverLoc?: boolean;
  isNear?: boolean;
}>`
width: ${(p) => (p.isNear ? "6px" : "4px")};
height: ${(p) => (p.isNear ? "6px" : "4px")};
border-radius: 50%;
background: ${(props) => props.canrotate === "true" ? "#ff15fb" : "#0d0d12"};
position: absolute;
cursor: pointer;
left: ${(p) => p.left}px;
top: ${(p) => p.top}px;
/* 蓋過車輛圖示(z-index:200000)，避免點位被 AMR 擋住點不到 */
z-index: 200001;
/* box-shadow:  ${(props) => props.canrotate === "true" ? " 0 0 4px rgba(253, 43, 180, 0.6)" : " 0 0 4px rgba(0, 0, 0, 0.6)"}; */
transform: translate(-50%, -50%);
border: ${(props) => (props.hoverLoc ? "5px solid #ff0000" : "none")};
transition: width 0.12s ease-out, height 0.12s ease-out;
  &:hover {
    background: red;
    width: 9px;
    height: 9px;
  }
`;

export const Point = memo(PointDiv);

const PointMainDiv = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
  hoverLoc?: boolean;
  isNear?: boolean;
}>(({ left, top, canrotate, hoverLoc }) => ({
  style: { left: Math.round(left), top: Math.round(top), canrotate, hoverLoc },
}))<{
  left: number;
  top: number;
  canrotate: string;
  hoverLoc?: boolean;
  isNear?: boolean;
}>`
width: ${(p) => (p.isNear ? "5px" : "3px")};
height: ${(p) => (p.isNear ? "5px" : "3px")};
border-radius: 50%;
background: ${(props) => props.canrotate === "true" ? "#ff15fb" : "#0d0d12"};
position: absolute;
cursor: pointer;
left: ${(p) => p.left}px;
top: ${(p) => p.top}px;
/* 蓋過車輛圖示(z-index:200000)，避免點位被 AMR 擋住點不到 */
z-index: 200001;
/* box-shadow:  ${(props) => props.canrotate === "true" ? " 0 0 4px rgba(253, 43, 180, 0.6)" : " 0 0 4px rgba(0, 0, 0, 0.6)"}; */
transform: translate(-50%, -50%);
border: ${(props) => (props.hoverLoc ? "5px solid #ff0000" : "none")};
transition: width 0.12s ease-out, height 0.12s ease-out;
  &:hover {
    background: red;
    width: 8px;
    height: 8px;
  }
`;

export const PointMain = memo(PointMainDiv);

const DraggableLineDiv = styled.div.attrs<{
  left: number;
  top: number;
  deg: number;
  width: number;
  openeditroadpanel: boolean;
}>(({ left, top, deg, width }) => ({
  style: {
    left,
    top,
    transform: `rotate(${deg || 0}deg)`,
    width: width ? width : 5,
  },
}))`
  display: ${(props) => (props.openeditroadpanel ? "block" : "none")};
  position: absolute;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    rgba(24, 144, 255, 0.15),
    #1890ff 40%,
    #1890ff 100%
  );
  box-shadow: 0 0 6px rgba(24, 144, 255, 0.55);
  transform-origin: 0 50%;
  pointer-events: none;

  /* 拖曳起點的圓點 */
  &::before {
    content: "";
    position: absolute;
    left: -4px;
    top: 50%;
    width: 8px;
    height: 8px;
    background: #1890ff;
    border-radius: 50%;
    transform: translateY(-50%);
    box-shadow: 0 0 6px rgba(24, 144, 255, 0.8);
  }

  /* 箭頭終點的三角形 */
  &::after {
    content: "";
    position: absolute;
    right: -2px;
    top: 50%;
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-left: 11px solid #1890ff;
    transform: translateY(-50%);
    filter: drop-shadow(0 0 3px rgba(24, 144, 255, 0.7));
    pointer-events: none;
  }
`;

const DragLineWrap: FC<{ locId: string; left: number; top: number }> = ({
  locId,
  left,
  top,
}) => {
  const showBlockId = useAtomValue(ShowBlockId);
  const setDragLineInfo = useAtomValue(DragLineInfo);
  const openEditRoadPanel = useAtomValue(EditRoadPanelSwitch);

  const { deg, width } = setDragLineInfo;
  if (locId !== showBlockId) return [];
  return (
    <>
      <DraggableLineDiv
        left={left}
        top={top}
        deg={deg as number}
        width={width as number}
        openeditroadpanel={openEditRoadPanel}
      ></DraggableLineDiv>
    </>
  );
};

export const DraggableLine = memo(DragLineWrap);



