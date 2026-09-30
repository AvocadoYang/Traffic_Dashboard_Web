import { useQuery } from "@tanstack/react-query";
import { array, boolean, object, string } from "yup";
import client from "./axiosClient";

export type MirMissionVariableValueType =
  | "float"
  | "int"
  | "bool"
  | "string"
  | "location"
  | "mixed";

export interface MirMissionVariable {
  name: string;
  value_type: MirMissionVariableValueType;
  is_location: boolean;
}

const schema = object({
  mission_title_id: string().required(),
  variables: array(
    object({
      name: string().required(),
      value_type: string().required(),
      is_location: boolean().required(),
    }).required(),
  ).required(),
}).required();

const getMirMissionVariables = async (amrId: string, missionName: string) => {
  const { data } = await client.get<unknown>(
    "api/setting/mir-mission-variables",
    { params: { amrId, missionName } },
  );
  const result = await schema.validate(data);
  return result.variables as MirMissionVariable[];
};

// 每次都向 MiR 即時查，任務在 MiR 上被改過也能拿到最新的變數
const useMirMissionVariables = (amrId?: string, missionName?: string) => {
  return useQuery(
    ["mir-mission-variables", amrId, missionName],
    () => getMirMissionVariables(amrId ?? "", missionName ?? ""),
    { enabled: !!amrId && !!missionName, retry: false, staleTime: 0 },
  );
};

export default useMirMissionVariables;
