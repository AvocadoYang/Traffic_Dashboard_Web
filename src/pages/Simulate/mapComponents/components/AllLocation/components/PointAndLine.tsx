import styled from "styled-components";
import { FC, memo } from "react";
import { useAtomValue } from "jotai";
import { DragLineInfo, showBlockId as ShowBlockId } from "@/utils/gloable";
import { EditRoadPanelSwitch } from "@/utils/siderGloble";

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
  width: ${(props) => (props.canrotate === "true" ? "6.5px" : "5px")};
  height: ${(props) => (props.canrotate === "true" ? "6.5px" : "5px")};
  background: ${(props) =>
    props.canrotate === "true" ? "#f27ef4" : "#1b00ce"};
  border-radius: ${(props) => (props.canrotate === "true" ? 0 : "50%")};
  z-index: 10;
  transition-duration: 200ms;

  border: ${(props) => (props.hoverLoc ? "5px solid #ff0000" : "none")};
  &:hover {
    background: red;
    scale: 1.8;
  }
`;

export const Point = memo(PointDiv);

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
