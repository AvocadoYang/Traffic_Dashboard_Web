import { useQuery } from "@tanstack/react-query";
import { object, boolean } from "yup";
import client from "./axiosClient";

const getData = async () => {
  const { data } = await client.get<unknown>("api/corning/crate");

  return data as {
    "6-Metal": number;
    "5": number;
    "6-Inno": number;
    "6-Wooden": number;
    "6-KC": number;
    "5.5": number;
    "6-TC": number;
    "Wrapper":number
    // [key: string]: number;
  };
};

const useCrate = () => {
  return useQuery({
    queryKey: ["crate"],
    queryFn: getData,
  });
};

export default useCrate;
