import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { array, object, string, boolean } from "yup";

const schema = array(
  object({
    id: string().required("ID is required"),
    full_name: string().required("full name is required"),
    serialNum: string().required("Process order is required"),
    is_enable: boolean().required("Process order is required"),

    Robot_type: object({
      id: string().required("robot type ID is required"),
      name: string().required("robot type name is required"),
      value: string().required("robot type value is required"),
    }).required(),
  }).optional(),
).optional();

const getRegisterAmr = async () => {
  const { data } = await client.get<unknown>("api/setting/all-register");
  const validatedData = await schema.validate(data, { stripUnknown: true });
  return validatedData;
};

const useRegisterAmr = () => {
  return useQuery(["all-register-amr"], getRegisterAmr);
};

export default useRegisterAmr;
