import { useQuery } from '@tanstack/react-query';
import { array, object, number, InferType, string } from 'yup';
import client from './axiosClient';

const chargeSchema = array(
  object({
    locationId: number().required(),
    x: number().required(),
    y: number().required(),
    translateX: number().required(),
    translateY: number().required(),
    rotate: number().required(),
    scale: number().required(),
    flex_direction: string().required('all charge require')
  }).optional()
);

const getCharges = async () => {
  const { data } = await client.get<unknown>('api/setting/all-charge-station');
  const validatedData = await chargeSchema.validate(data, {
    stripUnknown: true
  });
  return validatedData;
};

const useAllChargeStation = () => {
  return useQuery(['all-charge-station'], getCharges);
};

export type SingleChargeStation = {
  locationId: number;
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
};

export type AllChargeStationType = InferType<typeof chargeSchema>;

export default useAllChargeStation;
