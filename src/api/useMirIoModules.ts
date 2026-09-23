import { useQuery } from "@tanstack/react-query";
import { array, object, string } from "yup";
import client from "./axiosClient";

export interface MirIoModule {
  guid: string;
  url: string;
  name: string;
  type: string;
}

const schema = array(
  object({
    guid: string().required(),
    url: string().optional().default(""),
    name: string().required(),
    type: string().optional().default(""),
  }).required(),
).required();

const getMirIoModules = async (amrId: string) => {
  const { data } = await client.get<unknown>("api/setting/mir-io-modules", {
    params: { amrId },
  });
  const result = await schema.validate(data, { stripUnknown: true });
  return result as MirIoModule[];
};

// IO module 是車上的硬體設定（在 MiR 後台插拔模組或改名都會變），所以不留快取：
// staleTime 0 + 由 enabled 控制，下拉每次被打開都會重新向 MiR 問一次。上一次的
// 結果還留在 cache 裡，打開的瞬間先顯示舊的，新的回來再換掉。
const useMirIoModules = (amrId?: string, enabled = true) => {
  return useQuery(
    ["mir-io-modules", amrId],
    () => getMirIoModules(amrId ?? ""),
    { enabled: !!amrId && enabled, retry: false, staleTime: 0 },
  );
};

export default useMirIoModules;
