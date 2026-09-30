import { useQuery } from "@tanstack/react-query";
import { array, boolean, number, object, string } from "yup";
import client from "./axiosClient";

// cd 分支的交管 /warning_list 回傳的是 warn.json 的欄位名稱
// (info / debug / Alarm_music …),新增 / 編輯的 API 則還是收
// is_open_buzzer / info_ch / solution_ch。這裡統一轉成後者,
// 用到這張表的畫面就不用各自處理兩套名稱。
const versionSchema = array(
  object({
    id: number().required(),
    Alarm_music: boolean().default(false),
    info: string().default(""),
    info_en: string().default(""),
    debug: string().default(""),
    debug_en: string().default(""),
    pack: string().default(""),
    safety_event: string().default(""),
  }).required(),
).required();

const getTable = async () => {
  const { data } = await client.get<unknown>("api/setting/warning_list");

  const validatedData = await versionSchema.validate(data, {
    stripUnknown: true,
  });
  return validatedData.map((w) => ({
    id: w.id,
    is_open_buzzer: w.Alarm_music,
    info_ch: w.info,
    info_en: w.info_en,
    solution_ch: w.debug,
    solution_en: w.debug_en,
    pack: w.pack,
    safety_event: w.safety_event,
  }));
};

const useWarningTable = () => {
  return useQuery(["warning-table"], getTable);
};

export default useWarningTable;
