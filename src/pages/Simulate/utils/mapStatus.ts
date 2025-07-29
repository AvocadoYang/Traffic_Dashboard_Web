import { Mission_Schedule } from "@/sockets/useTimelineScheduleSocket";
import { atom } from "jotai";

export const globalScale = atom<number>(1);

export const EditConveyorConfig = atom<{
  stationId: string;
} | null>(null);

export const TimelineHeight = atom<"mini" | "normal" | "full">("normal");

export const OpenScheduleTable = atom<boolean>(false);

export const OpenEditModal = atom<boolean>(false);

export const IsEditSchedule = atom<boolean>(false);

export const SelectTime = atom<string | null>(null);

export const EditTask = atom<Mission_Schedule | null>(null);
