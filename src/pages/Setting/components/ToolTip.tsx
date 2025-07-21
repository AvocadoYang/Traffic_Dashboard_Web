import useMap from '@/api/useMap';
import { tooltipProp } from '@/utils/gloable';
import { rosCoord2DisplayCoord } from '@/utils/utils';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import styled from 'styled-components';

const TooltipWrapper = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: { left: left + 12, top }
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  &.show {
    opacity: 1;
  }
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
    mapResolution: data.mapResolution
  });
  return (
    <TooltipWrapper left={displayX} top={displayY} className={'show'}>
      {' '}
      {toolTipProps.locationId}
    </TooltipWrapper>
  );
};

export default ToolTip;
