import { array, boolean, object, string } from "yup";
import client from "./axiosClient";
import { useQuery } from "@tanstack/react-query";

const getData = async () => {
  const { data } = await client.get<unknown>(
    "api/setting/abort-when-has-cargo-task",
  );

  const schema = () =>
    array(
      object({
        id: string().required(),
        amrId: array(string().required()).required(),
        active: boolean().required(),
        taskName: string().required(),
        taskId: string().required(),
      }).required(),
    ).required();

  return schema().validate(data, { stripUnknown: true });
};

export const useAbortMissionWhenHasCargo = () => {
  return useQuery(["abort-mission-when-has-cargo"], getData);
};
