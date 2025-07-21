import useMap from '@/api/useMap';
import { rosCoord2DisplayCoord } from '@/utils/utils';
import { memo } from 'react';
import Cargo from './Cargo';
import { useAtomValue, useSetAtom } from 'jotai';
import { isShowLocation } from '@/utils/siderGloble';
import { nanoid } from 'nanoid';
import useLoc, { LocWithoutArr } from '@/api/useLoc';
import useCargoInfo from '@/sockets/useCargoInfo';
import styled from 'styled-components';
import { tooltipProp } from '@/utils/gloable';

const PointDiv = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
}>(({ left, top, canrotate }) => ({
  style: { left, top, canrotate }
}))<{
  left: number;
  top: number;
  canrotate: string;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
  background: ${(props) => (props.canrotate === 'true' ? '#ebac5b' : '#1b00ce')};
  border-radius: 50%;
  z-index: 10;
  transition-duration: 200ms;
  &:hover {
    background: red;
    scale: 1.8;
  }
`;

const WrapperForCargo = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: { left, top }
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
`;

export const Point = memo(PointDiv);

const AllCargo: React.FC = () => {
  const shelfInfo = useCargoInfo();
  const showLocation = useAtomValue(isShowLocation);
  const { data } = useMap();
  const setTooltip = useSetAtom(tooltipProp);

  const handleEnter = (locationId: string, x: number, y: number) => {
    setTooltip({
      x,
      y,
      locationId
    });
  };

  const handleLeave = () => {
    setTooltip(null);
  };
  const { data: locInfo } = useLoc(undefined);

  if (!data || !showLocation) return;
  return (
    <>
      {data.locations
        .filter(({ areaType }) => areaType === 'Storage')
        .map((loc) => {
          const [displayX, displayY] = rosCoord2DisplayCoord({
            x: loc.x,
            y: loc.y,
            mapHeight: data?.mapHeight,
            mapOriginX: data?.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution
          });

          const info = locInfo as LocWithoutArr[];

          const translateX = info?.find((i) => i.locationId === loc.locationId)?.translateX || 0;
          const translateY = info?.find((i) => i.locationId === loc.locationId)?.translateY || 0;
          const rotate = info?.find((i) => i.locationId === loc.locationId)?.rotate || 0.1;
          const LocScale = info?.find((i) => i.locationId === loc.locationId)?.scale || 1;
          const flex_direction =
            info?.find((i) => i.locationId === loc.locationId)?.flex_direction || 'row';
          return (
            <div
              draggable={false}
              key={loc.locationId}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              style={{ borderRadius: '50%' }}
            >
              <Point
                id={loc.locationId.toString()}
                canrotate={`${loc.canRotate}`}
                left={displayX}
                top={displayY}
                key={nanoid()}
                onMouseEnter={() => handleEnter(loc.locationId, loc.x, loc.y)}
                onMouseLeave={() => handleLeave()}
              ></Point>
              <WrapperForCargo left={displayX} top={displayY}>
                <Cargo
                  id={loc.id}
                  locId={loc.locationId}
                  translateX={translateX}
                  translateY={translateY}
                  scale={LocScale}
                  rotate={rotate}
                  flex_direction={flex_direction}
                  shelfInfo={shelfInfo?.find((s) => s.locationId === loc.locationId)}
                />
              </WrapperForCargo>
            </div>
          );
        })}
    </>
  );
};

export default memo(AllCargo);
