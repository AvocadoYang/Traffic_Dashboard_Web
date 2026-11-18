import { useQuery } from "@tanstack/react-query";
import { array, boolean, object, string } from "yup";
import client from "./axiosClient";
import { setAmrColorOrder } from "@/utils/utils";

const getName = async () => {
  const { data } = await client.get<unknown>("api/test/all-amr-name");
  const schema = () =>
    object({
      isSim: boolean().required(),
      amrs: array(
        object({
          amrId: string().required(),
          serialNumber: string().required(),
          isReal: boolean().required(),
          color: string().nullable().optional(),
        }).required(),
      ).required(),
    }).required();

  const names = await schema().validate(data, { stripUnknown: true });
  // 車輛識別色依這份名單分配 (見 utils 的 amrId2ColorRainbow)
  setAmrColorOrder(
    names.amrs.map((a) => a.amrId),
    Object.fromEntries(names.amrs.filter((a) => a.color).map((a) => [a.amrId, a.color as string])),
  );
  return names;
};

const useName = () => {
  return useQuery(["all-amr-name"], {
    queryFn: () => {
      return getName();
    },
  });
};

export default useName;
