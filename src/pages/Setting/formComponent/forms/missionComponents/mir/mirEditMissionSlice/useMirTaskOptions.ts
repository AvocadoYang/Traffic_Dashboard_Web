import { useFootprint } from "@/api/useFootprint";
import useMap from "@/api/useMap";

import { useMemo } from "react";

const useMirTaskOptions = () => {
  const { data: mapData } = useMap();
  const { data: footprintData } = useFootprint();

  const locationsOption = useMemo(() => {
    return (
      mapData?.locations.map((v) => ({
        label: v.locationId,
        value: v.locationId,
      })) || []
    );
  }, [mapData]);

  const footprintOption = useMemo(() => {
    return (
      footprintData?.map((v) => ({
        label: v.name,
        value: v.id,
      })) || []
    );
  }, [mapData]);

  return {
    locationsOption,
    footprintOption,
  };
};

export default useMirTaskOptions;
