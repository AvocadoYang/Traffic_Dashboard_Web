import { atomWithStorage } from "jotai/utils";

/** 首頁地圖顯示 2D 還是 3D (存 localStorage, 預設 2D) */
export type MapViewMode = "2d" | "3d";
export const mapViewModeAtom = atomWithStorage<MapViewMode>("fleet-map-view", "2d");
