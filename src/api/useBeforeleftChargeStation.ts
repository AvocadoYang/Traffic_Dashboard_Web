import { useQuery } from "@tanstack/react-query";
import { array, boolean, object, string } from "yup";
import client from "./axiosClient";

const getBLCS = async () => {
  const { data } = await client.get<unknown>(
    "api/setting/all-before-left-charge-station",
  );

  const schema = () =>
    array(
      object({
        id: string().optional(),
        active: boolean().optional(),
        amrId: array(string().optional()).optional(),
        // 這一筆只管哪些充電站; 空的 = 所有充電站 (舊後端不會給這一欄)
        stationLocationIds: array(string().required()).optional(),
        missionId: string().optional().nullable(),
        name: string().optional().nullable(),
      }).optional(),
    ).optional();

  return schema().validate(data, { stripUnknown: true });
};

/** 進入充電站強制任務, 回來的形狀跟離開充電站強制任務一樣 */
const getBECS = async () => {
  const { data } = await client.get<unknown>(
    "api/setting/all-before-enter-charge-station",
  );

  return array(
    object({
      id: string().optional(),
      active: boolean().optional(),
      amrId: array(string().optional()).optional(),
      stationLocationIds: array(string().required()).optional(),
      missionId: string().optional().nullable(),
      name: string().optional().nullable(),
    }).optional(),
  )
    .optional()
    .validate(data, { stripUnknown: true });
};

export const useBECS = () => {
  return useQuery(["BECS"], {
    queryFn: () => {
      return getBECS();
    },
  });
};

const useBLCS = () => {
  return useQuery(["BLCS"], {
    queryFn: () => {
      return getBLCS();
    },
  });
};

export default useBLCS;
