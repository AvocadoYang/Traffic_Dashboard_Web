import { array, boolean, number, object, string } from "yup";
import client from "./axiosClient";
import { useQuery } from "@tanstack/react-query";

interface MarkerTypeRow {
  id?: string;
  name: string;
  docking_type: number;
  bar_length: number;
  bar_distance: number;
  orientation_offset: number;
  x_offset: number;
  y_offset: number;
  created_by?: string;
}

const LIST_URL = "api/setting/all-marker-type";

export const useMarkerType = () => {
  return useQuery({
    queryKey: ["marker-types"],
    queryFn: async () => {
      const res = await client.get<MarkerTypeRow[]>(LIST_URL);
      return res.data;
    },
  });
};
