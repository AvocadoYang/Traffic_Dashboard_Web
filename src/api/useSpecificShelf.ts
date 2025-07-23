import { useQuery } from "@tanstack/react-query";
import { array, number, object, string } from "yup";
import client from "./axiosClient";

const collectionSchema = object({
  name: string().optional().nullable(),
  TitleBridgeLocs: array(
    object({
      missionType: string().required(),
      missionOrder: number().required(),
      Title: object({
        id: string().required(),
        name: string().required(),
      })
        .optional()
        .nullable(),
    }),
  )
    .optional()
    .nullable(),

  Dir: object({
    id: string().required(),
    yaw: number().required(),
  })
    .optional()
    .nullable(),
}).required();

const getCollection = async (locId: string) => {
  const { data } = await client.get<unknown>(
    `api/setting/specific-shelf?locId=${locId}`,
  );
  const validatedData = await collectionSchema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useSpecificShelf = (locId: string) => {
  return useQuery(["specific-shelf"], {
    queryFn: () => {
      return getCollection(locId);
    },
    enabled: !!locId,
  });
};

export default useSpecificShelf;
