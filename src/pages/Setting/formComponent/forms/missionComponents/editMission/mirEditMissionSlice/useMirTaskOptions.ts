import useMap from "@/api/useMap";

import { useMemo } from "react";

const useMirTaskOptions = () => {
  const { data: mapData } = useMap();

  
  const locationsOption = useMemo(() => {
    return (
      mapData?.locations.map((v) => ({
        label: v.locationId,
        value: v.locationId,
      })) || []
    );
  }, [mapData]);

  return {
    locationsOption,
  };
};

export default useMirTaskOptions;
