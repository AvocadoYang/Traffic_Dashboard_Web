import { useQuery } from "@tanstack/react-query";
import { array, object, string } from "yup";
import client from "./axiosClient";

const getCategory = async () => {
  const { data } = await client.get<unknown>("api/setting/all-category");

  const schema = () =>
    array(
      object({
        id: string().required(),
        tagName: string().required(),
        color: string().required(),
      }).required(),
    ).optional();

  return schema().validate(data, { stripUnknown: true });
};

const useCategory = () => {
  return useQuery(["all-category"], {
    queryFn: () => {
      return getCategory();
    },
  });
};

export default useCategory;
