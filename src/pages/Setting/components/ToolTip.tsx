import useMap from "@/api/useMap";
import { tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { useAtomValue } from "jotai";
import { FC } from "react";
import styled from "styled-components";
import { HoverLabel, TOOLTIP_Z_INDEX } from "../mapComponents/components/HoverLabel";

const TooltipWrapper = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: { left: left + 12, top },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  z-index: ${TOOLTIP_Z_INDEX};
  pointer-events: none;
  transform: translateY(-50%);
`;

const ToolTip: FC = () => {
  const toolTipProps = useAtomValue(tooltipProp);
  const { data } = useMap();

  if (!toolTipProps || !data) return [];

  const [displayX, displayY] = rosCoord2DisplayCoord({
    x: toolTipProps.x,
    y: toolTipProps.y,
    mapHeight: data?.mapHeight,
    mapOriginX: data?.mapOriginX,
    mapOriginY: data.mapOriginY,
    mapResolution: data.mapResolution,
  });
  return (
    <TooltipWrapper left={displayX} top={displayY}>
      <HoverLabel $accent="blue">{toolTipProps.locationId}</HoverLabel>
    </TooltipWrapper>
  );
};

export default ToolTip;
