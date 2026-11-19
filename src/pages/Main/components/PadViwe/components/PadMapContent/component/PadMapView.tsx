import { RefObject } from "react";
import MapImage from "@/features/map/layers/MapImage";
import AllLocation from "./AllLocation";
import AllRoads from "@/features/map/layers/AllRoads/AllRoads";
import AllAnnotations from "@/features/map/layers/AllAnnotations/AllAnnotations";
import AllZones from "@/features/map/layers/AllZones/AllZones";
import AllAMRs from "./AllAMRs/AllAMRs";
import AllPointCloud from "./AllPointCloud/AllPointCloud";
import LocalizationCorrectionGhost from "./LocalizationCorrection/LocalizationCorrectionGhost";
const PadMapView: React.FC<{
  scale: number;
  mapRef: RefObject<HTMLDivElement>;
}> = ({ scale, mapRef }) => {
  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "0% 0%",
        position: "relative",
      }}
      className="map-view"
      ref={mapRef}
      draggable={false}
    >
      <MapImage></MapImage>
      <AllAnnotations scale={scale} />
      <AllLocation></AllLocation>
      <AllZones scale={scale}></AllZones>
      <AllAMRs></AllAMRs>
      <AllRoads></AllRoads>
      <AllPointCloud></AllPointCloud>
      <LocalizationCorrectionGhost></LocalizationCorrectionGhost>
    </div>
  );
};

export default PadMapView;
