import { useQuery } from '@tanstack/react-query';
import { InferType, array, boolean, number, object, string } from 'yup';
import client from './axiosClient';

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    robot_id: string().required(),
    MissionTitleBridgeCategory: array(
      object({
        id: string().required(),
        missionTitleId: string().required(),
        categoryId: string().required(),
        Category: object({
          id: string().required(),
          tagName: string().required(),
          color: string().required()
        }).optional()
      })
    ).required(),
    Robot_types: object({
      id: string().required(),
      name: string().required(),
      value: string().required()
    })
      .required()
      .nullable(),

    mission_slice: array(
      object({
        id: string().required(),
        process_order: number().required(),
        disable: boolean().required(),
        detail: string().required()
      })
        .required()
        .nullable()
    ).optional()
  }).required()
);

const getAllMissionTitle = async () => {
  const { data } = await client.get<unknown>('api/setting/all-mission-title-detail');

  const parsed = await schema.validate(data, { stripUnknown: true });
  return parsed;
};

export type MTType = InferType<typeof schema>;

const useAllMissionTitlesDetail = () => {
  return useQuery(['all-mission-title-detail'], getAllMissionTitle);
};

export default useAllMissionTitlesDetail;
