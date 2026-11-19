import useMap from "@/api/useMap";
import { tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { useAtomValue } from "jotai";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { HoverLabel, TOOLTIP_Z_INDEX } from "../mapComponents/components/HoverLabel";
import useCargoInfo from "@/sockets/useCargoInfo";
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

/** 後端 cargo-info 每層還會帶這兩個欄位 (型別檔沒列) */
type LiveLevel = {
  levelName?: string | null;
  disable?: boolean;
  booker?: string | null;
  status?: number;
  statusOverride?: number | null;
};

const Card = styled.div<{ $bad: boolean }>`
  margin-top: 4px;
  padding: 3px 7px;
  background: rgba(17, 24, 39, 0.88);
  border: 1px solid ${({ $bad }) => ($bad ? "#ff4d4f" : "#52c41a")};
  border-radius: 8px;
  color: #fff;
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
`;

/** 儲位現在的即時狀態: PAC 回報的狀態、設定頁停用、預約者分開寫,才看得出是誰擋住 */
const StorageStatus: FC<{ locationId: string }> = ({ locationId }) => {
  const info = useCargoInfo();
  const { t } = useTranslation();
  const station = info?.[locationId];
  if (!station || station.type !== "STORAGE" || !station.layer) return null;
  const levels = Object.entries(station.layer) as [string, LiveLevel][];
  if (levels.length === 0) return null;
  const multi = levels.length > 1;
  const rows = levels.map(([level, l]) => {
    const status = l.status ?? 0;
    const offline = status === 0 || status === 10;
    const parts = [
      t(`storage_hover.s${status}`, { defaultValue: String(status) }),
      l.disable ? t("storage_hover.disabled") : null,
      l.booker && l.booker !== "none" ? `${t("storage_hover.booked")} ${l.booker}` : null,
    ].filter(Boolean);
    return { level, offline, bad: offline || status === 40 || status === 70 || !!l.disable, text: parts.join(" · ") };
  });
  return (
    <Card $bad={rows.some((r) => r.bad)}>
      {rows.map((r) => (
        <div key={r.level} style={r.bad ? { color: "#ff7875" } : undefined}>
          {multi ? `L${r.level} ` : ""}
          {r.text}
        </div>
      ))}
    </Card>
  );
};

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
      <StorageStatus locationId={String(toolTipProps.locationId)} />
    </TooltipWrapper>
  );
};

export default ToolTip;
