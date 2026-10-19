import useMap from "@/api/useMap";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { FC, memo, useEffect, useState } from "react";
import styled from "styled-components";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Popover } from "antd";
import { useTranslation } from "react-i18next";
import ZoneHoverCard, { ZoneHoverInfo } from "./ZoneHoverCard";
import { c, font } from "@/pages/SettingV2/ui/tokens";
import useToggleZoneEnabled from "@/api/useToggleZoneEnabled";

type ZoneInfo = ZoneHoverInfo & {
  startPoint: {
    startX: number;
    startY: number;
  };
  endPoint: {
    endX: number;
    endY: number;
  };
};

const toOpaque = (color: string) => {
  const rgb = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (!rgb) return color;
  const [, r, g, b] = rgb;
  return `rgb(${r}, ${g}, ${b})`;
};

const Frame = styled.div.attrs<{
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  $disabled?: boolean;
}>(({ left, top, width, height, color, $disabled }) => ({
  style: {
    left,
    top,
    width: `${width}px`,
    height: `${height}px`,
    // 停用的區域改成灰色斜線 + 虛線框, 一眼就跟啟用中的區域分得開
    background: $disabled
      ? "repeating-linear-gradient(135deg, rgba(128, 128, 128, 0.22) 0 4px, transparent 4px 10px)"
      : color,
    border: $disabled
      ? "2px dashed rgba(128, 128, 128, 0.9)"
      : `2px solid ${toOpaque(color)}`,
  },
}))<{
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  $disabled?: boolean;
}>`
  box-sizing: border-box;
  position: absolute;
`;

const FrameName = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: {
    left,
    top,
  },
}))<{
  left: number;
  top: number;
}>`
  z-index: 100;
  font-size: 1em;
  box-sizing: border-box;
  position: absolute;

  /* 深色主題配原圖(白底)時,主題的淺色字在白底上看不到 */
  [data-theme-mode="dark"][data-map-canvas="light"] & {
    color: #1c1c1c;
  }
`;

const NameText = styled.p<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  white-space: nowrap;
  ${({ $disabled }) => ($disabled ? "opacity: 0.7;" : "")}
`;

const DisabledBadge = styled.span`
  padding: 0 5px;
  font-family: ${font.mono};
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  letter-spacing: 0.5px;
  color: #ffffff;
  background: rgba(110, 110, 110, 0.95);
`;

const Zone: FC<{ id: string; info: ZoneInfo; scale: number }> = ({
  id,
  info,
}) => {
  const { data } = useMap();
  const [axis, setAxis] = useState({ x: -5000, y: -5000 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hidden, setHidden] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const { t } = useTranslation();
  // 放在這層而不是卡片裡: 對話框打開時游標離開卡片, 卡片關掉也不影響對話框
  const { setEnabled, pendingId, contextHolder } = useToggleZoneEnabled();
  const disabled = !!info.disabled;
  useEffect(() => {
    if (!data) return;

    const [startXDisplay, startYDisplay] = rosCoord2DisplayCoord({
      x: info.startPoint.startX,
      y: info.startPoint.startY,
      mapHeight: data.mapHeight,
      mapOriginX: data.mapOriginX,
      mapOriginY: data.mapOriginY,
      mapResolution: data.mapResolution,
    });

    const [endXDisplay, endYDisplay] = rosCoord2DisplayCoord({
      x: info.endPoint.endX,
      y: info.endPoint.endY,
      mapHeight: data.mapHeight,
      mapOriginX: data.mapOriginX,
      mapOriginY: data.mapOriginY,
      mapResolution: data.mapResolution,
    });

    setAxis({
      x: Math.min(startXDisplay, endXDisplay),
      y: Math.min(startYDisplay, endYDisplay),
    });
    setSize({
      width: Math.abs(endXDisplay - startXDisplay),
      height: Math.abs(endYDisplay - startYDisplay),
    });
  }, [info, data]);

  if (!data) return;
  return (
    <>
      {contextHolder}
      <FrameName left={axis.x} top={axis.y - 18} draggable={false}>
        {hidden ? (
          <EyeInvisibleOutlined
            style={{ cursor: "pointer" }}
            onClick={() => setHidden(false)}
          />
        ) : (
          <EyeOutlined
            style={{ cursor: "pointer" }}
            onClick={() => setHidden(true)}
          />
        )}
      </FrameName>
      <Popover
        open={cardOpen}
        onOpenChange={setCardOpen}
        placement="rightTop"
        arrow={false}
        content={
          <ZoneHoverCard
            info={info}
            open={cardOpen}
            toggling={pendingId === info.id}
            onToggleEnabled={(enabled) => {
              setCardOpen(false);
              setEnabled(info, enabled);
            }}
          />
        }
        styles={{
          container: {
            padding: 0,
            borderRadius: 2,
            border: `1px solid ${c.border}`,
            background: c.bg,
          },
        }}
      >
        <FrameName left={axis.x + 22} top={axis.y - 20} draggable={false}>
          <NameText $disabled={disabled}>
            {disabled && (
              <DisabledBadge>{t("zone_enable.disabled")}</DisabledBadge>
            )}
            {info.name}
          </NameText>
        </FrameName>
      </Popover>
      {hidden ? (
        []
      ) : (
        <Frame
          id={id}
          left={axis.x}
          top={axis.y}
          height={size.height}
          width={size.width}
          color={info.backgroundColor}
          $disabled={disabled}
          draggable={false}
        ></Frame>
      )}
    </>
  );
};

export default memo(Zone);
