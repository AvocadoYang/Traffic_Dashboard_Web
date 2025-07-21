import { FC, memo, RefObject, useEffect, useState } from 'react';
import useMap from '@/api/useMap';
import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { EditZoneSwitch } from '@/utils/siderGloble';

const Container = styled.div.attrs<{ left: number; top: number }>(({ left, top }) => ({
  style: { left, top }
}))<{ left: number; top: number }>`
  position: absolute;
`;

const Circle = styled.div`
  position: absolute;
  width: 35px;
  height: 25px;

  /* border-width: 1px; */
  background:
    linear-gradient(90deg, #333 50%, transparent 50%) repeat-x,
    linear-gradient(90deg, #333 50%, transparent 50%) repeat-x,
    linear-gradient(0deg, #333 50%, transparent 50%) repeat-y,
    linear-gradient(0deg, #333 50%, transparent 50%) repeat-y;
  /* transform: translate(-50%, -50%); */

  @keyframes linearGradientMove {
    100% {
      background-position:
        10px 0,
        -10px 100%,
        0 -10px,
        100% 10px;
    }
  }

  background-size:
    10px 3px,
    10px 3px,
    3px 10px,
    3px 10px;

  background-position:
    0 0,
    0 100%,
    0 0,
    100% 0;

  animation: linearGradientMove 0.5s linear infinite;
`;

const ZoneIconHint: FC<{
  mapWrapRef: RefObject<HTMLDivElement>;
  mapRef: RefObject<HTMLDivElement>;
  mapImageRef: RefObject<HTMLDivElement>;
  scale: number;
  isDragging: boolean;
}> = ({ mapWrapRef, mapRef, mapImageRef, scale, isDragging }) => {
  const openEditZone = useAtomValue(EditZoneSwitch);
  const [mouseMoveLocationForFrame, setMouseMoveLocationForFrame] = useState({
    displayX: -1000,
    displayY: -1000
  });

  useEffect(() => {
    const mouseMoveEventForMapRef = (e: MouseEvent) => {
      if (!mapRef.current || !mapWrapRef.current || isDragging) return;
      const { clientX, clientY } = e;
      const Left = mapWrapRef.current.scrollLeft;
      const Top = mapWrapRef.current.scrollTop;

      const adjustX = clientX - mapRef.current.offsetLeft + Left;
      const adjustY = clientY - mapRef.current.offsetTop + Top;

      setMouseMoveLocationForFrame({ displayX: adjustX / scale, displayY: adjustY / scale });
    };

    // 當鼠標離開地圖時，隱藏 Icon
    const mouseLeaveEventForMapRef = () => {
      setMouseMoveLocationForFrame({ displayX: -1000, displayY: -1000 });
    };

    if (!mapWrapRef.current || !mapRef.current || !mapImageRef.current || !data || !openEditZone)
      return;
    if (isDragging) {
      setMouseMoveLocationForFrame({ displayX: -1000, displayY: -1000 });
    }
    const mapPanel = mapRef.current;
    // 綁定滑鼠移動事件
    mapPanel.addEventListener('mousemove', mouseMoveEventForMapRef);
    mapPanel.addEventListener('mouseleave', mouseLeaveEventForMapRef);

    return () => {
      mapPanel.removeEventListener('mousemove', mouseMoveEventForMapRef);
      mapPanel.removeEventListener('mouseleave', mouseLeaveEventForMapRef);
    };
  }, [isDragging, scale]);

  const { displayX: x, displayY: y } = mouseMoveLocationForFrame;
  const { data } = useMap();
  if (!data) return null;
  return (
    <Container left={Number(x)} top={Number(y)} draggable={false}>
      <Circle />
    </Container>
  );
};

export default memo(ZoneIconHint);
