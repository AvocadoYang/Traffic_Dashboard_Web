import { useQuery } from '@tanstack/react-query';
import { array, number, object, string } from 'yup';
import client from './axiosClient';

const getLoc = async () => {
  const { data } = await client.get<unknown>('api/setting/all-loc-only');

  const strSchema = string().optional().nullable();

  const relationshipSchema = object().test(
    'relation-type',
    'relationship has format error',
    (value) => {
      if (!value || Object.keys(value).length === 0) return true;

      if (typeof value !== 'object' || Array.isArray(value)) return false;

      for (const key in value) {
        const levelValue = value[key];
        const valid = strSchema.isValidSync(levelValue);
        if (!valid) return false;
      }

      return true;
    }
  );

  const schema = () =>
    array(
      object({
        id: string().required(),
        locationId: string().required(),
        areaType: string().required(),
        translateX: number().required(),
        translateY: number().required(),
        rotate: number().required(),
        scale: number().required(),
        flex_direction: string().required('all loc only req'),
        placement_priority: number().required(),
        relationships: relationshipSchema.optional().nullable(),
        prepare_point: object({
          id: string().required(),
          locationId: string().required()
        })
          .optional()
          .nullable()
      }).required()
    ).required();

  return schema().validate(data);
};

const useLoc = (locId: string | undefined) => {
  return useQuery(['loc-only', locId], {
    queryFn: getLoc,
    select: (data) => {
      if (locId) {
        return data.find((location) => location.locationId === locId);
      }
      return data;
    }
  });
};

export type Relation = {
  [locationId: string]: string;
};

export type LocWithoutArr = {
  id: string;
  locationId: string;
  areaType: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  placement_priority: number;
  relationships: Relation;
  flex_direction: string;
  prepare_point: {
    id: string;
    locationId: string;
  };
};

export default useLoc;
