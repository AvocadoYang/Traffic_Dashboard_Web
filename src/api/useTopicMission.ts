import { array, boolean, number, object, string } from "yup";
import client from "./axiosClient";
import { useQuery } from "@tanstack/react-query";

const getTopic = async () => {
  const { data } = await client.get<unknown>("api/setting/topic-task");

  const schema = () =>
    array(
      object({
        id: string().required(),
        amrId: array(string().required()).required(),
        topicId: number().required(),
        active: boolean().required(),
        taskName: string().required(),
        taskId: string().required(),
      }).required(),
    ).required();

  return schema().validate(data, { stripUnknown: true });
};

export const useTopicMission = () => {
  return useQuery(["topic-task"], getTopic);
};
