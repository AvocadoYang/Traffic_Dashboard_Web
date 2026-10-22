import useMap from "@/api/useMap";
import { tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { useAtomValue } from "jotai";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { HoverLabel, TOOLTIP_Z_INDEX } from "../mapComponents/components/HoverLabel";
import { isStandbyAreaType } from "../mapComponents/components/AllLocation/pointAreaTypes";

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
  const { t } = useTranslation();

  if (!toolTipProps || !data) return [];

  // 待命區的點位在地圖上只多一圈,游標移上去時把屬性名稱一起寫出來,才知道那一圈是什麼意思
  const hovered = data.locations.find(
    (loc) => String(loc.locationId) === String(toolTipProps.locationId),
  );
  const isStandby = !!hovered && isStandbyAreaType(hovered.areaType);

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
      <HoverLabel $accent="blue">
        {toolTipProps.locationId}
        {isStandby ? ` · ${t("edit_location_panel.Standby")}` : null}
      </HoverLabel>
    </TooltipWrapper>
  );
};

export default ToolTip;
