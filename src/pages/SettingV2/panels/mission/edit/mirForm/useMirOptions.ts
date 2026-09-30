import { useMemo } from "react";
import useMap from "@/api/useMap";
import { useFootprint } from "@/api/useFootprint";
import { useMarkerType } from "@/api/useMarkerType";
import {
  useMirIoModuleOptions,
  useMirSoundOptions,
} from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/useMirTaskOptions";
import { OptionSource } from "./mirActionSpec";

export type Option = { label: string; value: string };

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
  const { soundOption, ...soundsLive } = useMirSoundOptions();
  const { ioModuleOption, ...ioModulesLive } = useMirIoModuleOptions();

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

  const bySource = (source: OptionSource): Option[] => {
    switch (source) {
      case "locations":
        return locations;
      case "footprints":
        return footprintOptions;
      case "sounds":
        return soundOption;
      case "ioModules":
        return ioModuleOption;
    }
  };

  /** 只有即時清單有狀態可以顯示,本地那幾份回 undefined */
  const liveStateOf = (source: OptionSource): LiveState | undefined => {
    if (source === "sounds") return soundsLive;
    if (source === "ioModules") return ioModulesLive;
    return undefined;
  };

  return { locations, markerTypeOptions, bySource, liveStateOf };
};

export default useMirOptions;
