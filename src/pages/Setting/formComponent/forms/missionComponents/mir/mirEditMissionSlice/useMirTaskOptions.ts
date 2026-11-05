import useAmrName from "@/api/useAmrName";
import { useFootprint } from "@/api/useFootprint";
import useMap from "@/api/useMap";
import { useMarkerType } from "@/api/useMarkerType";
import useMirIoModules from "@/api/useMirIoModules";
import useMirSounds from "@/api/useMirSounds";
import useShelf from "@/api/useShelf";
import { useSound } from "@/api/useSound";
import { useAllAmrStatus } from "@/sockets/useAMRInfo";
import { Form, FormInstance } from "antd";

import { useMemo } from "react";

// 貨架樣式 type_1 / Shelf position，需要可以點選 marker_type
export const MARKER_TYPE_SHELF_STYLE = "type_1";
export const MARKER_TYPE_AREA_TYPE = "MIR_SHELF_POSITION";

const useMirTaskOptions = () => {
  const { data: mapData } = useMap();
  const { data: footprintData } = useFootprint();
  const { data: markerType } = useMarkerType();
  const { data: shelfData } = useShelf();
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
  }, [footprintData]);

  const soundOption = useMemo(() => {
    return (
      sounds.data?.map((v) => ({
        label: v.name,
        value: v.id,
      })) || []
    );
  }, [sounds.data]);

  const markerTypeOption = useMemo(() => {
    return (
      markerType?.map((v) => ({
        label: v.name,
        value: v.id,
      })) || []
    );
  }, [markerType]);

  const markerTypeLocationIds = useMemo(
    () =>
      new Set([
        ...(shelfData
          ?.filter(
            (v) => v.ShelfCategory?.shelf_style === MARKER_TYPE_SHELF_STYLE,
          )
          .map((v) => v.peripheral_station.source.locationId) ?? []),
        ...(mapData?.locations
          .filter((v) => v.areaType === MARKER_TYPE_AREA_TYPE)
          .map((v) => v.locationId) ?? []),
      ]),
    [shelfData, mapData],
  );

  return {
    locationsOption,
    footprintOption,
    soundOption,
    markerTypeOption,
    markerTypeLocationIds,
  };
};

/** 車上的音檔、IO module 可能同名,同名時用 guid 尾碼分開 */
const toGuidOptions = (items: { guid: string; name: string }[]) => {
  const nameCount = new Map<string, number>();
  items.forEach((item) => {
    nameCount.set(item.name, (nameCount.get(item.name) ?? 0) + 1);
  });

  return items.map((item) => ({
    value: item.guid,
    label:
      (nameCount.get(item.name) ?? 0) > 1
        ? `${item.name} (…${item.guid.slice(-4)})`
        : item.name,
  }));
};

const useFirstAvailableAmrId = () => {
  const { data: amrName } = useAmrName();
  const amrStatus = useAllAmrStatus();

  return useMemo(() => {
    const wantReal = !amrName?.isSim;
    const online = new Set(
      amrStatus.filter((s) => !s.isOverdue).map((s) => s.amrId),
    );
    return amrName?.amrs.find(
      (a) => a.isReal === wantReal && online.has(a.amrId),
    )?.amrId;
  }, [amrName, amrStatus]);
};

export const useMirIoModuleOptions = () => {
  const amrId = useFirstAvailableAmrId();
  const { data, isFetching, error, refetch } = useMirIoModules(amrId);

  const ioModuleOption = useMemo(() => toGuidOptions(data ?? []), [data]);

  /** guid 換成顯示名稱;清單裡沒有(沒車在線、模組被移除)就直接顯示 guid */
  const ioModuleNameOf = useMemo(() => {
    const labelByGuid = new Map(ioModuleOption.map((o) => [o.value, o.label]));
    return (guid: string) => labelByGuid.get(guid) ?? guid;
  }, [ioModuleOption]);

  return { ioModuleOption, ioModuleNameOf, amrId, isFetching, error, refetch };
};

export const useMirSoundOptions = () => {
  const amrId = useFirstAvailableAmrId();
  const { data, isFetching, error, refetch } = useMirSounds(amrId);

  const soundOption = useMemo(() => toGuidOptions(data ?? []), [data]);

  return { soundOption, amrId, isFetching, error, refetch };
};

export const useMirDockingMarkerType = (form: FormInstance) => {
  const { markerTypeLocationIds } = useMirTaskOptions();
  const isCurrentPosition = !!Form.useWatch("is_current_position", form);
  const locationId = Form.useWatch("location_id", form);

  return {
    isCurrentPosition,
    showMarkerType:
      isCurrentPosition || markerTypeLocationIds.has(locationId ?? ""),
  };
};

export default useMirTaskOptions;
