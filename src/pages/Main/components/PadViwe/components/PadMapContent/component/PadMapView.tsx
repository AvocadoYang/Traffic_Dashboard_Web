import { RefObject } from 'react';
import { MapImage } from '@/pages/Setting/mapComponents/components';
import AllLocation from './AllLocation';
import AllRoads from '@/pages/Setting/mapComponents/components/AllRoads/AllRoads';
import { AllZones } from '@/pages/Setting/mapComponents/components';
import AllAMRs from './AllAMRs/AllAMRs';
const PadMapView: React.FC<{ scale: number; mapRef: RefObject<HTMLDivElement> }> = ({
  scale,
  mapRef
}) => {
  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: '0% 0%',
        position: 'relative'
      }}
      className="map-view"
      ref={mapRef}
      draggable={false}
    >
      <MapImage></MapImage>
      <AllLocation></AllLocation>
      <AllZones scale={scale}></AllZones>
      <AllAMRs></AllAMRs>
      <AllRoads></AllRoads>
    </div>
  );
};

export default PadMapView;
