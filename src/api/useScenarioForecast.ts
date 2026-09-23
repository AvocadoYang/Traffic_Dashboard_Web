import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

export interface ForecastRow {
  groupId: string;
  groupName: string;
  capacity: number;
  inflowPerHour: number;
  hasSink: boolean;
  /** null 代表不會塞滿 (有出口消化, 或根本沒有進料) */
  minutesToFull: number | null;
}

export interface ScenarioForecast {
  inflowPerHour: number;
  hasAnyRule: boolean;
  hasFallback: boolean;
  rows: ForecastRow[];
}

export const SCENARIO_FORECAST_KEY = ["scenario-forecast"];

const getData = async (): Promise<ScenarioForecast> => {
  const { data } = await client.get<ScenarioForecast>("api/scenario/forecast");
  return data;
};

const useScenarioForecast = () =>
  useQuery({ queryKey: SCENARIO_FORECAST_KEY, queryFn: getData });

export default useScenarioForecast;
