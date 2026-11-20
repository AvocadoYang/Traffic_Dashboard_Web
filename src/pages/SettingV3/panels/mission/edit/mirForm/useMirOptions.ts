import { useMemo } from "react";
import useMap from "@/api/useMap";
import { useFootprint } from "@/api/useFootprint";
import { useMarkerType } from "@/api/useMarkerType";
import useShelf from "@/api/useShelf";
import {
  MARKER_TYPE_AREA_TYPE,
  MARKER_TYPE_SHELF_STYLE,
  useMirIoModuleOptions,
  useMirSoundOptions,
} from "@/hooks/mission/useMirTaskOptions";
import {
  MIR_DEFAULT_IO_MODULE,
  MIR_DEFAULT_SOUND,
} from "@/pages/SettingV3/forms/missionComponents/mir/mirEditMissionSlice/mirActionFields";
import { OptionSource } from "./mirActionSpec";

export type Option = { label: string; value: string };

/**
 * MiR 內建的音檔、IO module, 每台車都有。沒車在線、即時清單是空的時候
 * 下拉裡至少還有它們, 預設值也才不會只顯示一串 guid。
 * 車上清單有同一個 guid 時用車上的名稱。
 */
const DEFAULT_SOUND_OPTION: Option = { label: "Default sound", value: MIR_DEFAULT_SOUND };
const DEFAULT_IO_MODULE_OPTION: Option = { label: "Internal IO", value: MIR_DEFAULT_IO_MODULE };

const withDefault = (list: Option[], fallback: Option) =>
  list.some((o) => o.value === fallback.value) ? list : [fallback, ...list];

/** 即時清單的狀態,下拉要靠它顯示「讀取中」「沒有車在線」 */
export type LiveState = {
  amrId?: string;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
};

/**
 * MiR 動作參數的下拉選項。
 *
 * v1 的 useMirTaskOptions 裡,footprint / markerType 兩個 useMemo 的依賴陣列
 * 都是空的,只會在第一次渲染(資料還是 undefined)算一次就再也不更新,所以那些
 * 下拉永遠是空的。這裡把依賴補上。
 *
 * 音效與 IO module 則直接重用 v1 的 hook:那兩份清單是即時向車上問來的
 * (車上隨時會被上傳/刪除音檔、插拔 IO 模組),而且存進任務的是 MiR 的 guid,
 * 跟本地資料庫那份 sound 的 id 不是同一個 id space,用錯就會存到對不上的值。
 */
const useMirOptions = () => {
  const { data: mapData } = useMap();
  const { data: footprints } = useFootprint();
  const { data: markerTypes } = useMarkerType();
  const { data: shelfData } = useShelf();
  const sounds = useMirSoundOptions();
  const ioModules = useMirIoModuleOptions();

  const soundOptions = useMemo(
    () => withDefault(sounds.soundOption, DEFAULT_SOUND_OPTION),
    [sounds.soundOption],
  );
  const ioModuleOptions = useMemo(
    () => withDefault(ioModules.ioModuleOption, DEFAULT_IO_MODULE_OPTION),
    [ioModules.ioModuleOption],
  );

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

  const markerTypeOptions = useMemo(
    () => (markerTypes ?? []).map((v) => ({ label: v.name, value: v.id })),
    [markerTypes],
  );

  /** 這些點位(type_1 貨架、MiR Shelf position)docking 時要選 marker type */
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

  /** optionSelect 欄位的下拉, 用欄位的 source 取 */
  const options: Record<OptionSource, Option[]> = {
    locations,
    footprints: footprintOptions,
    sounds: soundOptions,
    ioModules: ioModuleOptions,
  };

  /** 即時向車上查的清單才有讀取狀態, 其他 source 沒有 */
  const live: Partial<Record<OptionSource, LiveState>> = { sounds, ioModules };

  /**
   * operation 裡存的 id / guid → 顯示名稱, 卡片摘要用。
   * footprint id 跟 MiR 的 guid 都是 uuid 不會撞, 放同一張表就好。
   * 名稱是空字串的 (音檔可能沒取名) 不放, 摘要就會退回顯示 id。
   */
  const names = useMemo(
    () =>
      new Map(
        [...footprintOptions, ...soundOptions, ...ioModuleOptions]
          .filter((o) => o.label)
          .map((o) => [o.value, o.label]),
      ),
    [footprintOptions, soundOptions, ioModuleOptions],
  );

  return {
    locations,
    markerTypeOptions,
    markerTypeLocationIds,
    options,
    live,
    names,
  };
};

export default useMirOptions;
