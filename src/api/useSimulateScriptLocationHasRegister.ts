import { useQuery } from '@tanstack/react-query';
import { boolean, object } from 'yup';
import client from './axiosClient';

const schema = object({
  isRegister: boolean().required()
}).required();

const getVerity = async (locationId: string) => {
  const { data } = await client.post<unknown>('api/simulate/is-place-has-robot', {
    locationId
  });
  const validatedData = await schema.validate(data, { stripUnknown: true });
  return validatedData;
};

const useSimulateScriptLocationHasRegister = (locationId: string) => {
  return useQuery(['is-place-has-robot', locationId], {
    queryFn: () => {
      return getVerity(locationId);
    },
    enabled: !!locationId
  });
};

export default useSimulateScriptLocationHasRegister;
