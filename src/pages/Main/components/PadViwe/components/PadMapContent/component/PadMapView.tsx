import { RefObject } from "react";
import MapImage from "@/components/MapLayers/MapImage";
import AllLocation from "./AllLocation";
import AllRoads from "@/components/MapLayers/AllRoads/AllRoads";
import AllAnnotations from "@/components/MapLayers/AllAnnotations/AllAnnotations";
import AllZones from "@/components/MapLayers/AllZones/AllZones";
import AllAMRs from "./AllAMRs/AllAMRs";
import AllPointCloud from "./AllPointCloud/AllPointCloud";
import LocalizationCorrectionGhost from "@/components/LocalizationCorrection/LocalizationCorrectionGhost";
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
