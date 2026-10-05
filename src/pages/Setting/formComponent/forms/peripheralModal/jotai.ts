import { Relation } from "@/api/useLoc";
import { Cargo, PeripheralTypes } from "@/types/peripheral";
import { atom } from "jotai";

export const IsEditPeripheralModal = atom<{
  stationType: PeripheralTypes;
  stationId: string;
  name: string;
  disable: boolean;
  forkHeight: number;
  activeLoad: boolean;
  activeOffload: boolean;
  loadMissionId: string;
  offloadMissionId: string;
  placement_priority?: number;
  relationships?: Relation;
  cargo: Cargo[];
  loadPriority: number;
  offloadPriority: number;
} | null>(null);

export const IsOpenPeripheralModal = atom<boolean>(false);

export const EditStackConfig = atom<{
  stationId: string;
  name: string;
  description: string;
  disable: boolean;

  loadMissionId: string;
  offloadMissionId: string;

  cargo: Cargo[];
  loadPriority: number;
  offloadPriority: number;
} | null>(null);

export const IsOpenStackModal = atom<boolean>(false);

/** 正在編輯哪個包膜線點位的設定;null 代表對話框關著 */
export const EditPackageLocationId = atom<string | null>(null);
