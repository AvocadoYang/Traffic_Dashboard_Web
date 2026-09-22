import useAmrName from "@/api/useAmrName";
import { useFootprint } from "@/api/useFootprint";
import useMap from "@/api/useMap";
import { useMarkerType } from "@/api/useMarkerType";
import useMirIoModules from "@/api/useMirIoModules";
import useShelf from "@/api/useShelf";
import { useSound } from "@/api/useSound";
import { Form, FormInstance } from "antd";

import { useMemo } from "react";

// 貨架樣式 type_1 / Shelf position，需要可以點選 marker_type
const MARKER_TYPE_SHELF_STYLE = "type_1";
const MARKER_TYPE_AREA_TYPE = "MIR_SHELF_POSITION";

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
          .map((v) => v.Loc.locationId) ?? []),
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

// /mir-io-modules 挑第一台可用的車：模擬環境用模擬車，否則用實體車。
// 同一隊 MiR 的 IO module 設定是一樣的，問哪一台結果都相同。
export const useMirIoModuleOptions = () => {
  const { data: amrName } = useAmrName();

  const amrId = useMemo(() => {
    const wantReal = !amrName?.isSim;
    return amrName?.amrs.find((a) => a.isReal === wantReal)?.amrId;
  }, [amrName]);

  const { data, isFetching, error, refetch } = useMirIoModules(amrId);

  const ioModuleOption = useMemo(
    () => data?.map((m) => ({ label: m.name, value: m.guid })) ?? [],
    [data],
  );

  return { ioModuleOption, amrId, isFetching, error, refetch };
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
