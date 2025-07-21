import { useQuery } from '@tanstack/react-query';
import { array, boolean, object, string } from 'yup';
import client from './axiosClient';

const getSchedule = async () => {
  const { data } = await client.get<unknown>('api/setting/all-schedule');

  const schema = () =>
    array(
      object({
        id: string().required(),
        active: boolean().required(),
        amrId: array(string().required()).required(),
        schedule: string().required(),
        missionId: string().required(),
        missionName: string().required()
      }).required()
    ).optional();

  return schema().validate(data, { stripUnknown: true });
};

const useSchedule = () => {
  return useQuery(['all-schedule'], {
    queryFn: () => {
      return getSchedule();
    }
  });
};

export default useSchedule;
