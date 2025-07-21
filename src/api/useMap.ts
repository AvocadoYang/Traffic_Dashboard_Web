import { useQuery } from '@tanstack/react-query';
import { array, boolean, InferType, lazy, mixed, number, object, string } from 'yup';
import { MISSION_CONTROL_URL, MISSION_CONTROL_WS_URL } from '../configs/config';
import api from './axiosClient';

const schema = object({
  locations: array(
    object({
      id: string().required(),
      locationId: string().required(),
      x: number().required(),
      y: number().required(),
      canRotate: boolean().required(),
      areaType: string().required()
    }).required()
  ).required(),
  roads: array(
    object({
      id: string().required(),
      roadId: string().required(),
      roadType: mixed<'oneWayRoad' | 'twoWayRoad'>().oneOf(['oneWayRoad', 'twoWayRoad']).required(),
      spot1Id: string().required(),
      spot2Id: string().required(),
      x1: number().required(),
      y1: number().required(),
      disabled: boolean().required(),
      priority: number().required(),
      limit: boolean().required(),
      x2: number().required(),
      y2: number().required(),
      validYawList: lazy((value) => {
        if (typeof value === 'string') return mixed<'*'>().oneOf(['*']).required();
        return array(number().min(0).max(360).required()).required();
      }),
      tolerance: number().optional(),
      cost: number().optional(),
      inflationRadius: number().optional()
    }).required()
  ).required(),
  zones: array(
    object({
      id: string().required(),
      name: string().required(),
      backgroundColor: string().required(),
      category: array(string().required()).required(),
      tagSetting: object({
        speed_limit: number().required().nullable(),
        hight_limit: number().required().nullable(),
        forbidden_car: array(string()).required(),
        limitNum: number().required().nullable(),
        view_available: number().required().nullable()
      }).required(),
      startPoint: object({
        startX: number().required(),
        startY: number().required()
      }).required(),
      endPoint: object({
        endX: number().required(),
        endY: number().required()
      }).required()
    })
  ).required(),
  mapWidth: number().positive().required(),
  mapHeight: number().positive().required(),
  mapOriginX: number().required(),
  mapOriginY: number().required(),
  mapResolution: number().positive().required(),
  imageUrl: string().optional()
}).required();

const getMap = async () => {
  const { data } = await api.get<unknown>('/map');
  const parsed = await schema.validate(data, { stripUnknown: true });
  if (parsed.imageUrl) {
    parsed.imageUrl = `${MISSION_CONTROL_URL.replace('localhost', location.host).replace(
      '5173',
      '4000'
    )}${parsed.imageUrl}`;
  }

  return parsed;
};

const useMap = () => {
  return useQuery(['map'], getMap);
};

export type MapType = InferType<typeof schema>;

export default useMap;
