import { Tooltip } from 'antd';
import { memo } from 'react';
import styled from 'styled-components';
import { rosCoord2DisplayCoord } from '@/utils/utils';
import { PointInfo, MapInfo } from '../locationInfo';

const Container = styled.div.attrs<{ left: number; top: number; canrotate: string }>(
  ({ left, top }) => ({
    style: { left, top }
  })
)<{ left: number; top: number; canrotate: string }>`
  position: absolute;
  width: 6.5px;
  background: #1225ce;
  background: ${(prop) => (prop.canrotate === 'false' ? '#1225ce' : '#f88f05')};
  height: 6.5px;
  z-index: 20px;
  border-radius: 50%;
`;

const Location: React.FC<{ pointInfo: PointInfo; mapInfo: MapInfo }> = ({ pointInfo, mapInfo }) => {
  const [left, top] = rosCoord2DisplayCoord({
    x: pointInfo.x,
    y: pointInfo.y,
    mapHeight: mapInfo.mapHeight,
    mapOriginX: mapInfo.mapOriginX,
    mapOriginY: mapInfo.mapOriginY,
    mapResolution: mapInfo.mapResolution
  });
  return (
    <Tooltip
      placement="bottom"
      title={pointInfo.locationId}
      style={{ width: '4.5px', height: '4.5px', borderRadius: '50%' }}
    >
      <Container
        left={left}
        draggable={false}
        top={top}
        canrotate={pointInfo.canRotate.toString()}
        key={pointInfo.locationId}
        className="location-wrap"
        onDragStart={(event) => {
          event.preventDefault();
        }}
      />
    </Tooltip>
  );
};

export default memo(Location);
