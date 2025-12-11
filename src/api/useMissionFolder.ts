import { useQuery } from "@tanstack/react-query";
import { array, object, string } from "yup";
import httpClient from "./axiosClient";

const schema = array(
  object({
    name: string().optional(),
    id: string().optional(),
    missionTitles: array(
      object({
        id: string().optional(),
      })
    ),
  })
).required();

const getFolder = async () => {
  const { data } = await httpClient.get<unknown>("api/setting/mission-folder");

  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useMissionFolder = () => {
  return useQuery({
    queryKey: ["mission-folder"],
    queryFn: getFolder,
  });
};

export default useMissionFolder;
