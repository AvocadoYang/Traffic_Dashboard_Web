import { atom } from "jotai";

export const globalScale = atom<number>(1);

export const EditConveyorConfig = atom<{
  stationId: string;
} | null>(null);
