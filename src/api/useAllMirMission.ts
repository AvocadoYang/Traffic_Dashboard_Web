import { useQuery } from "@tanstack/react-query";
import { array, object, string } from "yup";
import client from "./axiosClient";

export interface MirMissionRobotStatus {
  guid: string;
  synced_at: string;
}

export interface MirMissionRow {
  name: string;
  robots: Record<string, MirMissionRobotStatus | null>;
}

// robots' value shape is dynamic per fleet, so it isn't given a yup .shape()
// (stripUnknown would otherwise wipe out every key on an unshaped object)
const schema = array(
  object({
    name: string().required(),
    robots: object().required(),
  }).required(),
).required();

const getAllMirMission = async () => {
  const { data } = await client.get<unknown>("api/setting/all-mir-mission");
  return (await schema.validate(data)) as MirMissionRow[];
};

const useAllMirMission = () => {
  return useQuery(["all-mir-mission"], getAllMirMission);
};

export default useAllMirMission;
