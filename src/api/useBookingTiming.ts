import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/** AT_CREATE 任務建立當下就預約 / AT_ARRIVAL 車開到那一步才預約 */
export const BOOKING_TIMINGS = ["AT_CREATE", "AT_ARRIVAL"] as const;
export type BookingTiming = (typeof BOOKING_TIMINGS)[number];

/** 車到了卻挑不到位置: STAY 留在原地 / STANDBY 退到待命點 / RETURN_TO_POOL 任務收回去排隊 */
export const BLOCKED_ACTIONS = ["STAY", "STANDBY", "RETURN_TO_POOL"] as const;
export type BlockedAction = (typeof BLOCKED_ACTIONS)[number];

/** 放貨端車上已經有貨, 不能把任務收回去 */
export const OFFLOAD_BLOCKED_ACTIONS: readonly BlockedAction[] = ["STAY", "STANDBY"];

/** 取貨端車先去哪裡等: WAIT_POINT 作業區的等待點 / STANDBY 待命點 */
export const WAIT_KINDS = ["WAIT_POINT", "STANDBY"] as const;
export type WaitKind = (typeof WAIT_KINDS)[number];

/** 取貨端已經能取貨、車又不在等待位置時: BIND_NOW 直接預約去取 / STAGE_FIRST 先去等待位置, 到了再預約 */
export const PICK_READY_ACTIONS = ["BIND_NOW", "STAGE_FIRST"] as const;
export type PickReadyAction = (typeof PICK_READY_ACTIONS)[number];

export type BookingTimingSetting = {
  pickTiming: BookingTiming;
  pickBlocked: BlockedAction;
  pickWaitKinds: WaitKind[];
  pickReadyAction: PickReadyAction;
  offloadTiming: BookingTiming;
  offloadBlocked: BlockedAction;
};

export type BookingTimingGroup = {
  id: string;
  name: string;
  memberCount: number;
  configured: boolean;
  setting: BookingTimingSetting;
};

export type BookingTimingConfig = {
  /** false: 資料表還沒建 (後端啟動時會自動建, 或手動套 SQL) */
  schemaReady: boolean;
  /** 派車流程有沒有真的照設定做; false 時頁面提醒「選了還沒生效」 */
  enforced: { pick: boolean; offload: boolean };
  groups: BookingTimingGroup[];
};

export const BOOKING_TIMING_KEY = ["booking-timing-config"];

export const useBookingTimingConfig = () =>
  useQuery({
    queryKey: BOOKING_TIMING_KEY,
    queryFn: async () => {
      const { data } = await client.get<BookingTimingConfig>(
        "api/booking-timing/config",
      );
      return data;
    },
  });
