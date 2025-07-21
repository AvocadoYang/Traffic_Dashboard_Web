import { useQuery } from '@tanstack/react-query';
import { InferType, array, object, string } from 'yup';
import client from './axiosClient';

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    value: string().required()
  }).required()
);

const getAmrs = async () => {
  const { data } = await client.get<unknown>('api/setting/all-robot-type');
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

const useAMRsample = () => {
  return useQuery(['amr-sample'], getAmrs);
};
export type ASType = InferType<typeof schema>;
export default useAMRsample;
