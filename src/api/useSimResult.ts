import { useQuery } from "@tanstack/react-query";
import { array, date, number, object, string } from "yup";
import client from "./axiosClient";

const getSchedule = async () => {
  const { data } = await client.get<unknown>("api/simulate/result");

  const schema = () =>
    array(
      object({
        id: string().required(),
        startTime: string().required(),
        endTime: string().required(),
        total_cargos_carried: number().required(),
        mission_success_rate: number().required(),
        total_mission_count: number().required(),
        completed_missions: number().required(),
        createdAt: date().required(),
        amr_stat: array(
          object({
            amrName: string().required(),
            missionCount: number().required(),
            totalCarry: number().required(),
            totalBatteryCost: number().required(),
            idleTime: number().required(),
            workingTime: number().required(),
            totalDistance: number().required(),
          }),
        ).required(),

        timeline: array(
          object({
            timestamp: string().required(),
            priority: number().required(),
            type: string().oneOf(["NORMAL", "DYNAMIC", "NOTIFY"]).required(),
          }),
        ).required(),
      }),
    ).required();
  return schema().validate(data, { stripUnknown: true });
};

export interface SimulationResult {
  id: string;
  createdAt: Date;
  startTime: string;
  endTime: string;
  total_cargos_carried: number;
  mission_success_rate: number;
  total_mission_count: number;
  completed_missions: number;
  amr_stat: AmrStat[];
  timeline: TimelineEvent[];
}

export interface AmrStat {
  amrName: string;
  missionCount: number;
  totalCarry: number;
  totalBatteryCost: number;
  idleTime: number;
  workingTime: number;
  totalDistance: number;
}

export type TimelineType = "NORMAL" | "DYNAMIC" | "NOTIFY";

export interface TimelineEvent {
  timestamp: string;
  priority: number;
  type: TimelineType;
}

const useSimResult = () => {
  return useQuery({
    queryKey: ["sim-result"],
    queryFn: getSchedule,
  });
};

export default useSimResult;
