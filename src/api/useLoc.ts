import { useQuery } from "@tanstack/react-query";
import { array, number, object, string } from "yup";
import client from "./axiosClient";

const getLoc = async () => {
  const { data } = await client.get<unknown>("api/setting/all-loc-only");


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
        flex_direction: string().required("all loc only req"),
        prepare_point: object({
          id: string().required(),
          locationId: string().required(),
        })
          .optional()
          .nullable(),
      }).required(),
    ).required();

  return schema().validate(data);
};

const useLoc = (locId: string | undefined) => {
  return useQuery(["loc-only", locId], {
    queryFn: getLoc,
    select: (data) => {
      if (locId) {
        return data.find((location) => location.locationId === locId);
      }
      return data;
    },
  });
};

export type LocWithoutArr = {
  id: string;
  locationId: string;
  areaType: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
  prepare_point: {
    id: string;
    locationId: string;
  };
};

export default useLoc;
