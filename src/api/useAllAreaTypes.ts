import { useQuery } from '@tanstack/react-query';
import { array, object, string } from 'yup';
import client from './axiosClient';

const schema = array(
  object({
    label: string().required(),
    value: string().required()
  }).required()
).required();

const getData = async () => {
  const { data } = await client.get<unknown>('api/setting/all-area-type');
  const validatedData = await schema.validate(data, {
    stripUnknown: true
  });
  return validatedData;
};

const useAllAreaTypes = () => {
  return useQuery(['all-area-type'], getData);
};

export default useAllAreaTypes;
