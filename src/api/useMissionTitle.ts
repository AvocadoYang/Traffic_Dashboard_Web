import { useQuery } from '@tanstack/react-query';
import { InferType, array, object, string } from 'yup';
import client from './axiosClient';

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    MissionTitleBridgeCategory: array(
      object({
        Category: object({
          id: string().required(),
          tagName: string().required(),
          color: string().required()
        }).optional()
      })
    ).required()
  }).required()
);

const getAllMissionTitle = async () => {
  const { data } = await client.get<unknown>('api/setting/all-mission-title');

  const parsed = await schema.validate(data, { stripUnknown: true });
  return parsed;
};

export type MTType = InferType<typeof schema>;

const useAllMissionTitles = () => {
  return useQuery(['all-mission-title'], getAllMissionTitle);
};

export default useAllMissionTitles;
