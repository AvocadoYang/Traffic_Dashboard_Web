import { useQuery } from '@tanstack/react-query';
import { array, boolean, object, string } from 'yup';
import client from './axiosClient';

const getBLCS = async () => {
  const { data } = await client.get<unknown>('api/setting/all-before-left-charge-station');

  const schema = () =>
    array(
      object({
        id: string().optional(),
        active: boolean().optional(),
        amrId: array(string().optional()).optional(),
        missionId: string().optional(),
        name: string().optional()
      }).optional()
    ).optional();

  return schema().validate(data, { stripUnknown: true });
};

const useBLCS = () => {
  return useQuery(['BLCS'], {
    queryFn: () => {
      return getBLCS();
    }
  });
};

export default useBLCS;
