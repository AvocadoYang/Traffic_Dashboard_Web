import { useQuery } from '@tanstack/react-query';
import { array, number, object, string } from 'yup';
import client from './axiosClient';

const getSchedule = async () => {
  const { data } = await client.get<unknown>('api/simulate/result');

  const schema = () =>
    object({
      simulationId: string().required(),
      duration: number().required(),
      totalCargosCarried: number().required(),
      missionSuccessRate: number().required(),
      completedMissions: number().required(),
      totalMissionCount: number().required(),

      table: array(
        object({
          amrId: string().required(),
          missionsPerAmr: number().required(),
          batteryCostPerAmr: number().required(),
          averageMissionTimePerAmr: number().required(),
          totalDistanceTraveledPerAmr: number().required(),
          cargoCarryPerAmr: number().required()
        })
      ).optional()
    }).required();

  return schema().validate(data, { stripUnknown: true });
};

const useSimResult = () => {
  return useQuery(['sim-result'], {
    queryFn: () => {
      return getSchedule();
    }
  });
};

export default useSimResult;
