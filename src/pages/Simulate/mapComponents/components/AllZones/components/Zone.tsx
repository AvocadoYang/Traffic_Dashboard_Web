import useMap from '@/api/useMap';
import { rosCoord2DisplayCoord } from '@/utils/utils';
import { FC, memo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

type ZoneInfo = {
  id: string;
  category: string[];
  backgroundColor: string;
  name: string;
  startPoint: {
    startX: number;
    startY: number;
  };
  endPoint: {
    endX: number;
    endY: number;
  };
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
    border: '2px solid rgba(251, 23, 3, 0.32)'
  }
}))<{
  left: number;
  top: number;
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
    top
  }
}))<{
  left: number;
  top: number;
}>`
  z-index: 100;
  font-size: 1em;
  box-sizing: border-box;
  position: absolute;
`;

const Zone: FC<{ id: string; info: ZoneInfo; scale: number }> = ({ id, info }) => {
  const { data } = useMap();
  const [axis, setAxis] = useState({ x: -5000, y: -5000 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!data) return;

    const [startXDisplay, startYDisplay] = rosCoord2DisplayCoord({
      x: info.startPoint.startX,
      y: info.startPoint.startY,
      mapHeight: data.mapHeight,
      mapOriginX: data.mapOriginX,
      mapOriginY: data.mapOriginY,
      mapResolution: data.mapResolution
    });

    const [endXDisplay, endYDisplay] = rosCoord2DisplayCoord({
      x: info.endPoint.endX,
      y: info.endPoint.endY,
      mapHeight: data.mapHeight,
      mapOriginX: data.mapOriginX,
      mapOriginY: data.mapOriginY,
      mapResolution: data.mapResolution
    });

    setAxis({ x: Math.min(startXDisplay, endXDisplay), y: Math.min(startYDisplay, endYDisplay) });
    setSize({
      width: Math.abs(endXDisplay - startXDisplay),
      height: Math.abs(endYDisplay - startYDisplay)
    });
  }, [info, data]);

  if (!data) return;
  return (
    <>
      <FrameName left={axis.x} top={axis.y - 18} draggable={false}>
        {hidden ? (
          <EyeOutlined style={{ cursor: 'pointer' }} onClick={() => setHidden(false)} />
        ) : (
          <EyeInvisibleOutlined style={{ cursor: 'pointer' }} onClick={() => setHidden(true)} />
        )}

        {` ${info.name}`}
      </FrameName>
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
