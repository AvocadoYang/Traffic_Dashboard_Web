import { useQuery } from "@tanstack/react-query";
import { array, object, string, number, InferType, boolean } from "yup";
import client from "./axiosClient";

const shelfSchema = array(
  object({
    id: string().required(),
    shelfCategoryId: string().nullable(),
    Loc: object({
      id: string().required(),
      name: string().optional().nullable(),
      region: string().optional().nullable(),
      locationId: string().required(),
      areaType: string().optional(),
      dirId: string().nullable(),
      shelfId: string().optional(),
    }).required(),
    ShelfCategory: object({
      id: string().required(),
      name: string().optional(),
      shelf_style: string().default("type_1"),
      Height: array(
        object({
          id: string().required(),
          height: number().required(),
          shelfCategoryId: string().required(),
        }).optional(),
      ).optional(),
    }).nullable(),
    ShelfConfig: array(
      object({
        id: string().optional(),
        name: string().optional().nullable(),
        level: number().required(),
        disable: boolean().required(),
        cargo_limit: number().required(),
        hasCargo: boolean().required(),
        shelfId: string().required(),
      }).optional(),
    ).required(),
  }).required(),
);

const getShelves = async () => {
  const { data } = await client.get<unknown>("api/setting/all-shelf");
  const validatedData = await shelfSchema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useShelf = () => {
  return useQuery(["shelf"], getShelves);
};

export type ShelfType = InferType<typeof shelfSchema>;

export default useShelf;
