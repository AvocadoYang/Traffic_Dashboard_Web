import { useQuery } from "@tanstack/react-query";
import { array, InferType, object, string } from "yup";
import client from "./axiosClient";

const schema = object({
  id: string().required(),
  name: string().required(),
  MissionTitleBridgeCategory: array(
    object({
      Category: object({
        id: string().required(),
        tagName: string().required(),
        color: string().required(),
      }).required(),
    }),
  ).optional(),
  Robot_types: object({
    id: string().required(),
    name: string().required(),
    value: string().required(),
  }).required(),
}).required();

const getById = async (id: string) => {
  const { data } = await client.get<unknown>(
    `api/setting/mission-title-by-id?id=${id}`,
  );

  const parsed = await schema.validate(data, { stripUnknown: true });
  return parsed;
};

export type MTType = InferType<typeof schema>;

const useMissionTitleById = (id: string) => {
  return useQuery(["mission-title-by-id"], {
    queryFn: () => {
      return getById(id);
    },
  });
};

export default useMissionTitleById;
