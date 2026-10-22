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

/**
 * query key 必須帶 id。之前 key 是固定的 ["mission-title-by-id"],
 * 換一筆任務不會換 key,所以 React Query 直接回上一次的快取、不會重打;
 * v1 是靠「Modal 關掉就整個 unmount」每次重新掛載才剛好繞過,
 * 常駐掛載的元件(SettingV2 的 MissionMetaModal)就會一直拿到第一次的結果。
 * 另外 id 是空字串時不該發請求,後端會回一筆過不了 schema 的東西。
 */
const useMissionTitleById = (id: string) => {
  return useQuery(["mission-title-by-id", id], {
    queryFn: () => {
      return getById(id);
    },
    enabled: !!id,
  });
};

export default useMissionTitleById;
