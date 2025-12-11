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
}>(({ left, top, canrotate, hoverLoc }) => ({
  style: { left, top, canrotate, hoverLoc },
}))<{
  left: number;
  top: number;
  canrotate: string;
  hoverLoc?: boolean;
}>`
width: 4px;
height: 4px;
border-radius: 50%;
background: ${(props) => props.canrotate === "true" ? "#ff15fb" : "#0d0d12"};
position: absolute;
cursor: pointer;
left: ${(p) => p.left}px;
top: ${(p) => p.top}px;
z-index: 150;
/* box-shadow:  ${(props) => props.canrotate === "true" ? " 0 0 4px rgba(253, 43, 180, 0.6)" : " 0 0 4px rgba(0, 0, 0, 0.6)"}; */
transform: translate(-50%, -50%);
border: ${(props) => (props.hoverLoc ? "5px solid #ff0000" : "none")};
  &:hover {
    background: red;
    width: 6px;
height: 6px;
  }
`;

export const Point = memo(PointDiv);

const PointMainDiv = styled.div.attrs<{
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
width: 3px;
height: 3px;
border-radius: 50%;
background: ${(props) => props.canrotate === "true" ? "#ff15fb" : "#0d0d12"};
position: absolute;
cursor: pointer;
left: ${(p) => p.left}px;
top: ${(p) => p.top}px;
z-index: 150;
/* box-shadow:  ${(props) => props.canrotate === "true" ? " 0 0 4px rgba(253, 43, 180, 0.6)" : " 0 0 4px rgba(0, 0, 0, 0.6)"}; */
transform: translate(-50%, -50%);
border: ${(props) => (props.hoverLoc ? "5px solid #ff0000" : "none")};
  &:hover {
    background: red;
    width: 6px;
height: 6px;
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
  background-color: black;
  height: 3px;
  transform-origin: 0 50%;
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    border: solid black;
    border-width: 0 3px 3px 0;
    display: inline-block;
    padding: 3px;
    right: 3px;
    bottom: -2.65px;
    transform: rotate(-45deg);
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



