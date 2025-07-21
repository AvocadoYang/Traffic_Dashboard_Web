import { useQuery } from '@tanstack/react-query';
import { array, boolean, number, object, string } from 'yup';
import client from './axiosClient';

const versionSchema = array(
  object({
    id: number().required(),
    is_open_buzzer: boolean().required(),
    info_ch: string().required(),
    info_en: string().required(),
    solution_ch: string(),
    solution_en: string(),
  }).optional()
).required();

const getTable = async () => {
  const { data } = await client.get<unknown>('api/setting/warning_list');
  console.log(data)
  const validatedData = await versionSchema.validate(data, {
    stripUnknown: true
  });
  return validatedData;
};

const useWarningTable = () => {
  return useQuery(['warning-table'], getTable);
};

export default useWarningTable;
