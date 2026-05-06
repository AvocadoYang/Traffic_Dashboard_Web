import { useQuery } from "@tanstack/react-query";
import { array, object, string, number, InferType, boolean, date } from "yup";
import client from "./axiosClient";

const schema = object({
  success: boolean().required(),
  totalSize: number().required(),
  backups: array(
    object({
      file: string().optional(),
      fullPath: string().optional(),
      size: number().optional(),
      createdAt: date().optional(),
    })
  )
    .required() // You still require the key to exist
    .nullable(),
});

const getBackup = async () => {
  const { data } = await client.get<unknown>("api/setting/backup");

  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useBackup = () => {
  return useQuery({
    queryKey: ["backup"],
    queryFn: getBackup,
  });
};

export default useBackup;
