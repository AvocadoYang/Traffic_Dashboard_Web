import { useQuery } from '@tanstack/react-query';
import { array, object, string } from 'yup';
import client from './axiosClient';

const versionSchema = array(
  object({
    id: string().required(),
    createAt: string().required(),
    dbPath: string().required()
  }).optional()
).optional();

const getVersion = async () => {
  const { data } = await client.get<unknown>('api/setting/backup-file');

  const validatedData = await versionSchema.validate(data, {
    stripUnknown: true
  });
  return validatedData;
};

const useVersion = () => {
  return useQuery(['version'], getVersion);
};

export default useVersion;
