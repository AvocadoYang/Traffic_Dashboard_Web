import { useQuery } from "@tanstack/react-query";
import { array, object, string, number, InferType } from "yup";
import client from "./axiosClient";

const shelfSchema = array(
  object({
    id: string().required(),
    name: string().required(),
    shelf_style: string().required(),
    Height: array(
      object({
        id: string().required(),
        height: number().required(),
        shelfCategoryId: string().required(),
      }).optional(),
    ).optional(),
  }).required(),
);

const getShelfCategory = async () => {
  const { data } = await client.get<unknown>("api/setting/all-shelf-category");

  // console.log(data);
  const validatedData = await shelfSchema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useShelfCategory = () => {
  return useQuery(["all-shelf-category"], getShelfCategory);
};

type ShelfHeight = {
  id: string;
  height: number;
  shelfCategoryId: string;
};

export type ShelfCategoryWithoutList = {
  id: string;
  name: string;
  shelf_style: string;
  Height: ShelfHeight[] | undefined;
};

export type ShelfCategory = InferType<typeof shelfSchema>;

export default useShelfCategory;
