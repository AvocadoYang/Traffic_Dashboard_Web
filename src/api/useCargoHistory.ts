import { array, object, string, date, boolean, mixed } from "yup";
import { InferType } from "yup";
import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";

const historySchema = array(
  object({
    id: string().required(),
    cargo_id: string().required(),
    action: string()
      .oneOf(["CREATED", "TRANSFER", "LOAD", "OFFLOAD", "SHIFTED", "UPDATED"])
      .required(),
    description: string().nullable(),
    actor: string().nullable(),
    timestamp: date().required(),
  })
).required();

const customCargoMetadataSchema = object({
  id: string().required(),
  is_default: boolean().required(),
  custom_name: string().required(),
  format: mixed().optional().nullable(),
})
  .optional()
  .nullable();

const schema = array(
  object({
    id: string().required(),
    status: string()
      .oneOf(["ON_AMR", "AT_LOCATION", "SHIFT", "PRE_SPAWN"])
      .required(),
    metadata: mixed().optional().nullable(),
    createdAt: date().required(),
    updatedAt: date().required(),
    register_robot_id: string().nullable(),
    script_robot_id: string().nullable(),
    shelfConfigId: string().nullable(),
    custom_cargo_metadata_id: string().nullable(),
    owner: string().required(),
    custom_id: string().required(),
    history: historySchema,
    custom_cargo_metadata: customCargoMetadataSchema,
  })
).required();

export type CargoListData = InferType<typeof schema>;

const getCargoHistory = async (page = 1, pageSize = 20) => {
  const { data } = await client.get("api/cargo-history/history", {
    params: { page, pageSize },
  });

  return schema
    .validate(data.data, { stripUnknown: true })
    .then((validated) => ({
      data: validated,
      total: data.total,
    }));
};

const useCargoHistory = (page: number, pageSize: number) => {
  return useQuery(["cargo-history", page, pageSize], () =>
    getCargoHistory(page, pageSize)
  );
};

export default useCargoHistory;
