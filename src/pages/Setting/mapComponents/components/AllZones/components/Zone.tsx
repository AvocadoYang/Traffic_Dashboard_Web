import useMap from "@/api/useMap";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { FC, memo, useEffect, useState } from "react";
import styled from "styled-components";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Popover } from "antd";
import ZoneHoverCard, { ZoneHoverInfo } from "./ZoneHoverCard";
import { c } from "@/pages/SettingV2/ui/tokens";

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
}>(({ left, top, width, height, color }) => ({
  style: {
    left,
    top,
    width: `${width}px`,
    height: `${height}px`,
    background: color,
    border: `2px solid ${toOpaque(color)}`,
  },
}))<{
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
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

const Zone: FC<{ id: string; info: ZoneInfo; scale: number }> = ({
  id,
  info,
}) => {
  const { data } = useMap();
  const [axis, setAxis] = useState({ x: -5000, y: -5000 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hidden, setHidden] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
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
        content={<ZoneHoverCard info={info} open={cardOpen} />}
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
          <p
            onClick={() => {}}
            style={{ cursor: "pointer" }}
          >{` ${info.name}`}</p>
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
          draggable={false}
        ></Frame>
      )}
    </>
  );
};

export default memo(Zone);
