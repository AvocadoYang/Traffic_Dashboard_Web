import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export type CargoSourceFullPolicy = "WAIT" | "SKIP" | "STOP";

export interface VariantWeight {
  value: string;
  weight: number;
}

export interface CargoSourceRow {
  id: string;
  name: string;
  isEnable: boolean;
  peripheralGroupId: string;
  peripheralGroupName: string;
  customCargoMetadataId: string;
  customCargoMetadataName: string;
  variantKey: string | null;
  variantPool: VariantWeight[];
  startTime: string;
  endTime: string;
  intervalSec: number;
  batchSize: number;
  jitterSec: number;
  maxTotal: number | null;
  whenFull: CargoSourceFullPolicy;
}

export interface RoutingRuleRow {
  id: string;
  name: string;
  isEnable: boolean;
  isFallback: boolean;
  ruleOrder: number;
  matchKey: string | null;
  matchValue: string | null;
  destGroupId: string | null;
  destGroupName: string | null;
  destPeripheralId: string | null;
  destPeripheralName: string | null;
  priority: number;
  amrRelateId: string | null;
  amrId: string | null;
}

export interface CargoSinkRow {
  id: string;
  name: string;
  isEnable: boolean;
  peripheralGroupId: string;
  peripheralGroupName: string;
  dwellSec: number;
}

export interface ScenarioOptions {
  groups: {
    id: string;
    name: string;
    size: number;
    peripherals: { id: string; name: string; type: string }[];
  }[];
  cargoFormats: {
    id: string;
    name: string;
    uniqueKey: string;
    keys: string[];
  }[];
  robots: { id: string; name: string; online: boolean }[];
}

export interface ScenarioConfigResponse {
  sources: CargoSourceRow[];
  rules: RoutingRuleRow[];
  sinks: CargoSinkRow[];
  options: ScenarioOptions;
  /** 這個環境 (HAS_MIR) 是否強制任務要指定車輛 */
  requireAmr: boolean;
  /** 情境用的三張表是否已經建好 (沒跑 yarn pdp 時為 false) */
  schemaReady: boolean;
}

export const SCENARIO_CONFIG_KEY = ["scenario-config"];

const getData = async (): Promise<ScenarioConfigResponse> => {
  const { data } = await client.get<ScenarioConfigResponse>(
    "api/scenario/config"
  );
  return data;
};

const useScenarioConfig = () =>
  useQuery({ queryKey: SCENARIO_CONFIG_KEY, queryFn: getData });

export default useScenarioConfig;
