import { useQuery } from "@tanstack/react-query";
import api from "./axiosClient";

const getMap = async () => {
  const { data } = await api.get<unknown>(
    "/api/cargo-history/container-location",
  );

  return (data as any).locations as Loc_For_CD[];
};

export type Loc_For_CD = {
  x: number;
  y: number;
  locationId: string;
  areaType: string;
  locationName: string;
  locationDescription: string;
  areaGroup: string;
  container: any;
};

const useContainerLocation = () => {
  return useQuery({
    queryKey: ["container-location"],
    queryFn: () => getMap(),
  });
};

export default useContainerLocation;
