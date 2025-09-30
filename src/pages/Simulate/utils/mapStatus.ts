import { Mission_Schedule } from "@/types/timeline";
import { atom } from "jotai";

export const globalScale = atom<number>(1);

export const EditConveyorConfig = atom<{
  stationId: string;
} | null>(null);

export const TimelineHeight = atom<"mini" | "normal" | "full">("normal");

export const OpenScheduleTable = atom<boolean>(false);

//**新增區域生成貨物 */
export const OpenRangeSpawnModal = atom<boolean>(false);

//**新增區域轉移貨物 */
export const OpenRangeShiftModal = atom<boolean>(false);

//**新增編輯固定時間任務 */
export const OpenFixedEventMissionEditModal = atom<boolean>(false);

//**新增編輯任務 */
export const OpenEditModal = atom<boolean>(false);

/**新增編輯Shift貨物 */
export const OpenEditShiftCargoModal = atom<boolean>(false);

//** 新增編輯Spawn貨物*/
export const OpenEditSpawnCargoModal = atom<boolean>(false);

export const IsEditSchedule = atom<boolean>(false);

export const SelectTime = atom<string | null>(null);

export const EditTask = atom<Mission_Schedule | null>(null);
