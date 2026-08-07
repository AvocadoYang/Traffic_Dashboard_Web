import { useFootprint } from "@/api/useFootprint";
import useMap from "@/api/useMap";
import { useSound } from "@/api/useSound";

import { useMemo } from "react";

const useMirTaskOptions = () => {
  const { data: mapData } = useMap();
  const { data: footprintData } = useFootprint();
  const sounds = useSound();

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
  }, []);

  const soundOption = useMemo(() => {
    return (
      sounds.data?.map((v) => ({
        label: v.name,
        value: v.id,
      })) || []
    );
  }, []);

  return {
    locationsOption,
    footprintOption,
    soundOption,
  };
};

export default useMirTaskOptions;
