import { RectInfo } from "@/pages/Setting/hooks/hook";
import { FC, memo } from "react";
import styled from "styled-components";

// ColorPicker 的值: 使用者選過色是 AggregationColor 物件, 從表單還原時可能是 rgba 字串。
export type FrameColor =
  | string
  | { toRgb: () => { r: number; g: number; b: number } }
  | undefined;

const DEFAULT_BORDER = "red";
const DEFAULT_FILL = "rgba(255, 0, 0, 0.03)";

// 填色的 alpha 跟存檔時寫進 backgroundColor 的 0.05 一致(見 EditZonePanel 的 save),
// 拉框當下看到的顏色就等於存檔後畫出來的區域顏色。
const resolveColor = (color: FrameColor) => {
  if (!color) return { border: DEFAULT_BORDER, fill: DEFAULT_FILL };
  if (typeof color === "string") return { border: color, fill: color };
  const { r, g, b } = color.toRgb();
  return {
    border: `rgb(${r}, ${g}, ${b})`,
    fill: `rgba(${r}, ${g}, ${b}, 0.05)`,
  };
};

const Frame = styled.div.attrs<{
  left: number;
  top: number;
  width: number;
  height: number;
  $borderColor: string;
  $fill: string;
}>(({ left, top, width, height, $borderColor, $fill }) => ({
  style: {
    left,
    top,
    width: `${width}px`,
    height: `${height}px`,
    borderColor: $borderColor,
    background: $fill,
  },
}))<{
  left: number;
  top: number;
  width: number;
  height: number;
  $borderColor: string;
  $fill: string;
}>`
  position: absolute;
  z-index: 100;
  width: 6px;
  height: 6px;
  border: 2px solid ${DEFAULT_BORDER};
  background: ${DEFAULT_FILL};
`;

const DragFrame: FC<{ rectInfo: RectInfo; color?: FrameColor }> = ({
  rectInfo,
  color,
}) => {
  const { axisX, axisY, width, height } = rectInfo;
  const { border, fill } = resolveColor(color);
  return (
    <>
      <Frame
        left={axisX}
        top={axisY}
        width={width}
        height={height}
        $borderColor={border}
        $fill={fill}
      ></Frame>
    </>
  );
};

export default memo(DragFrame);
