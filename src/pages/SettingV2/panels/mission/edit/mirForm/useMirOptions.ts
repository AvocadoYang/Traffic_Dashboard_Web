import { useMemo } from "react";
import useMap from "@/api/useMap";
import { useFootprint } from "@/api/useFootprint";
import { useSound } from "@/api/useSound";
import { useMarkerType } from "@/api/useMarkerType";
import { OptionSource } from "./mirActionSpec";

export type Option = { label: string; value: string };

/**
 * MiR 動作參數的下拉選項。
 *
 * v1 的 useMirTaskOptions 裡,footprint / sound / markerType 三個 useMemo
 * 的依賴陣列都是空的,只會在第一次渲染(資料還是 undefined)算一次就再也
 * 不更新,所以那三個下拉永遠是空的。這裡把依賴補上。
 */
const useMirOptions = () => {
  const { data: mapData } = useMap();
  const { data: footprints } = useFootprint();
  const { data: sounds } = useSound();
  const { data: markerTypes } = useMarkerType();

  const locations = useMemo(
    () =>
      (mapData?.locations ?? []).map((v) => ({
        label: v.locationId,
        value: v.locationId,
      })),
    [mapData],
  );

  const footprintOptions = useMemo(
    () => (footprints ?? []).map((v) => ({ label: v.name, value: v.id })),
    [footprints],
  );

  const soundOptions = useMemo(
    () => (sounds ?? []).map((v) => ({ label: v.name, value: v.id })),
    [sounds],
  );

  const markerTypeOptions = useMemo(
    () => (markerTypes ?? []).map((v) => ({ label: v.name, value: v.id })),
    [markerTypes],
  );

  const bySource = (source: OptionSource): Option[] => {
    switch (source) {
      case "locations":
        return locations;
      case "footprints":
        return footprintOptions;
      case "sounds":
        return soundOptions;
    }
  };

  return { locations, markerTypeOptions, bySource };
};

export default useMirOptions;
