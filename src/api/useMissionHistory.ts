// useAllMissionHistory.ts
import { useQuery } from '@tanstack/react-query';
import { array, object, string, number, boolean, date } from 'yup';
import client from './axiosClient';

const missionSchema = object({
  pagination: object({
    page: number().required(),
    pageSize: number().required(),
    total: number().required()
  }),
  data: array(
    object({
      id: string().required(),
      order: number().nullable(),
      priority: number().nullable(),
      send_by: number().required(),
      amrId: string().required(),
      status: number().required(),
      full_name: array(string().optional()).required().nullable(),
      category: array(string().optional()).required().nullable(),
      sub_name: string().nullable(),
      manualMode: boolean().required(),
      emergencyBtn: boolean().required(),
      recoveryBtn: boolean().required(),
      createdAt: date().nullable(),
      assignedAt: date().nullable(),
      startedAt: date().nullable(),
      completedAt: date().nullable(),
      warningIdList: array(number().optional()).nullable(),
      batteryCost: number().required(),
      batteryRateWhenStarted: number().required(),
      totalDistanceTraveled: number().required(),
      info: string().nullable(),
      message: string().nullable()
    }).required()
  )
});

const getAllMission = async (
  params: {
    page?: number;
    pageSize?: number;
  } = {}
) => {
  const { data } = await client.get<unknown>('api/missions/mission-history', {
    params: { page: params.page, pageSize: params.pageSize }
  });
  const parsed = await missionSchema.validate(data, { stripUnknown: true });
  return parsed;
};

const useAllMissionHistory = (params: { page?: number; pageSize?: number } = {}) => {
  return useQuery({
    queryKey: ['mission-history', params.page, params.pageSize],
    queryFn: () => getAllMission(params),
    retry: 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export default useAllMissionHistory;
