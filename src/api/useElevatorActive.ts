import { useQuery } from "@tanstack/react-query";
import { object, boolean } from "yup";
import client from "./axiosClient";

const schema = object({
  is_active: boolean().required(),
}).optional();

const getData = async () => {
  const { data } = await client.get<unknown>("api/corning/elevator-mission");
  const validatedData = await schema.validate(data, {
    stripUnknown: true,
  });
  return validatedData;
};

const useElevatorActive = () => {
  return useQuery({
    queryKey: ["elevator-active"],
    queryFn: getData,
  });
};

export default useElevatorActive;
