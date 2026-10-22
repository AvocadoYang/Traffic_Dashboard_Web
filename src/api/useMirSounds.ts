import { useQuery } from "@tanstack/react-query";
import { array, number, object, string } from "yup";
import client from "./axiosClient";

export interface MirSound {
  guid: string;
  name: string;
  url: string;
  /** "H:MM:SS"，小時沒有補零，MiR 不一定算得出來，可能是 "0:00:00" */
  length: string;
  /** 音檔存在車上的預設音量，不是 sound 動作播放時用的音量 */
  volume: number;
}

const schema = array(
  object({
    guid: string().required(),
    name: string().optional().default(""),
    url: string().optional().default(""),
    length: string().optional().default(""),
    volume: number().optional().default(0),
  }).required(),
).required();

const getMirSounds = async (amrId: string) => {
  const { data } = await client.get<unknown>("api/setting/mir-sounds", {
    params: { amrId },
  });
  const result = await schema.validate(data, { stripUnknown: true });
  return result as MirSound[];
};

// 跟 useMirIoModules 同一套:車上的音檔清單隨時會被上傳/刪除，所以不留快取，
// staleTime 0，由呼叫端在下拉打開時 refetch。
const useMirSounds = (amrId?: string, enabled = true) => {
  return useQuery(["mir-sounds", amrId], () => getMirSounds(amrId ?? ""), {
    enabled: !!amrId && enabled,
    retry: false,
    staleTime: 0,
  });
};

export default useMirSounds;
