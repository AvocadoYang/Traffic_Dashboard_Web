import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

/**
 * 取貨順序: 巷道規則先篩掉拿不到的位置, 這裡決定拿得到的位置之間誰先拿。
 * NEAREST 最近的先拿 / FEWEST_LEVELS 貨最少的 stack 先拿 / OLDEST_FIRST 最上層放最久的先拿
 */
export const PICK_ORDERS = ["NEAREST", "FEWEST_LEVELS", "OLDEST_FIRST"] as const;
export type PickOrder = (typeof PICK_ORDERS)[number];

export type PlacementPolicy = {
  /** 每條巷道是一串 peripheral_name.id, 由內 (最深) 到外 */
  lanes: string[][];
  maxLevels: number;
  heightKey: string | null;
  maxHeight: number | null;
  stackMatchKeys: string[];
  preferStacking: boolean;
  pickOrder: PickOrder;
};

export type PlacementGroup = {
  id: string;
  name: string;
  members: { id: string; name: string; type: string }[];
  policy: PlacementPolicy | null;
};

export type RouteCondition = { key: string; value: string };

export type ConveyorRouteRule = {
  id: string;
  name: string;
  ruleOrder: number;
  isEnable: boolean;
  isFallback: boolean;
  conditions: RouteCondition[];
  /** 依順序嘗試的目的群組 */
  destGroupIds: string[];
  priority: number;
};

export type PlacementConveyor = {
  id: string;
  name: string;
  /** 規則掛在輸送帶上,還是包膜線的出口上。舊版後端不會送,當成輸送帶 */
  type?: "CONVEYOR" | "PACKAGE";
  rules: ConveyorRouteRule[];
};

export type PlacementConfig = {
  /** 後端 YAML 的 ENABLE_MISSION_WAITING_STATUS */
  waitingEnabled: boolean;
  schemaReady: boolean;
  maxLevels: number;
  priorities: { label: string; value: number }[];
  cargoKeys: string[];
  groups: PlacementGroup[];
  conveyors: PlacementConveyor[];
};

export type ConveyorDispatchState =
  | "IDLE"
  | "DISABLED"
  | "BUSY"
  | "NO_RULE"
  | "NOT_READY"
  | "DISPATCHED"
  | "WAITING"
  | "BLOCKED";

export type ConveyorDispatchRuntime = {
  conveyor: string;
  state: ConveyorDispatchState;
  queueLength: number;
  head: {
    cargoInfoId: string;
    customId: string | null;
    metadata: Record<string, unknown>;
  } | null;
  ruleName: string | null;
  destGroups: string[];
  missionId: string | null;
  detail: string;
  updatedAt: string;
};

export const PLACEMENT_CONFIG_KEY = ["placement-config"];

export const usePlacementConfig = () =>
  useQuery({
    queryKey: PLACEMENT_CONFIG_KEY,
    queryFn: async () => {
      const { data } = await client.get<PlacementConfig>(
        "api/placement/config",
      );
      return data;
    },
  });

/** 每條輸送帶目前派送到哪、卡在哪; 幾秒刷新一次 */
export const useConveyorDispatchRuntime = () =>
  useQuery({
    queryKey: ["placement-runtime"],
    queryFn: async () => {
      const { data } = await client.get<{
        conveyors: ConveyorDispatchRuntime[];
      }>("api/placement/runtime");
      return data.conveyors;
    },
    refetchInterval: 3000,
  });
