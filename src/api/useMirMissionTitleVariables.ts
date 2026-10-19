import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { array, boolean, object, string } from "yup";
import client from "./axiosClient";

const schema = object({
  mission_title_id: string().required(),
  variables: array(
    object({
      name: string().required(),
      value_type: string().required(),
      is_location: boolean().required(),
      fields: array(string().required()).required(),
      slice_types: array(string().required()).required(),
    }).required(),
  ).required(),
}).required();

export type MirTitleVariable = {
  name: string;
  value_type: string;
  is_location: boolean;
  fields: string[];
  slice_types: string[];
};

const queryKey = (missionTitleId: string) => [
  "mir-mission-variables",
  "title",
  missionTitleId,
];

const getMirTitleVariables = async (missionTitleId: string) => {
  const { data } = await client.get<unknown>(
    "api/setting/mir-mission-variables",
    { params: { missionTitleId } },
  );
  const parsed = await schema.validate(data, { stripUnknown: true });
  return parsed.variables as MirTitleVariable[];
};

const useMirMissionTitleVariables = (missionTitleIds: string[]) => {
  const queryClient = useQueryClient();
  const ids = useMemo(
    () => [...new Set(missionTitleIds)].sort(),
    [missionTitleIds],
  );

  useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKey(id),
      queryFn: () => getMirTitleVariables(id),
      staleTime: 30_000,
    })),
  });

  const variablesOf = (id: string) =>
    queryClient.getQueryData<MirTitleVariable[]>(queryKey(id)) ?? [];

  const fetchVariables = useCallback(
    (id: string) =>
      queryClient.fetchQuery({
        queryKey: queryKey(id),
        queryFn: () => getMirTitleVariables(id),
        staleTime: 30_000,
      }),
    [queryClient],
  );

  return { variablesOf, fetchVariables };
};

export default useMirMissionTitleVariables;
