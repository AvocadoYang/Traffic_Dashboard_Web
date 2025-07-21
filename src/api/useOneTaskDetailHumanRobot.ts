import { useQuery } from '@tanstack/react-query';
import { array, boolean, number, object, string } from 'yup';
import client from './axiosClient';

const schema = object({
  id: string().required('ID is required'),
  process_order: number().required('Process order is required'),
  disable: boolean().required('Disable flag is required'),

  operation: object({
    locationId: number().optional(),
    type: array(string().required('Operation type must be a string')).optional(),
    control: array(string().required('Control must be a string')).optional(),
    param: array(
      object({
        joint: string().optional(),
        value: number().optional()
      })
    ).optional()
  }).required('Operation object is required')
}).optional();

const getOneTask = async (key: string) => {
  const { data } = await client.post<unknown>('api/setting/one-task-detail-human-robot', {
    key
  });
  const validatedData = await schema.validate(data, { stripUnknown: true });
  return validatedData;
};

const useOneTaskDetailHumanRobot = (key: string) => {
  return useQuery(['one-task-detail-human-robot', key], {
    queryFn: () => {
      return getOneTask(key);
    },
    enabled: !!key
  });
};

export default useOneTaskDetailHumanRobot;
