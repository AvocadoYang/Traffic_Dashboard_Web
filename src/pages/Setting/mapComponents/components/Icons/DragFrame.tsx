import { RectInfo } from "@/pages/Setting/hooks/hook";
import { FC, memo } from "react";
import styled from "styled-components";

const Frame = styled.div.attrs<{
  left: number;
  top: number;
  width: number;
  height: number;
}>(({ left, top, width, height }) => ({
  style: { left, top, width: `${width}px`, height: `${height}px` },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  z-index: 100;
  width: 6px;
  height: 6px;
  border: 2px solid red;
  background: rgba(255, 0, 0, 0.03);
`;

const DragFrame: FC<{ rectInfo: RectInfo }> = ({ rectInfo }) => {
  const { axisX, axisY, width, height } = rectInfo;
  return (
    <>
      <Frame left={axisX} top={axisY} width={width} height={height}></Frame>
    </>
  );
};

export default memo(DragFrame);
