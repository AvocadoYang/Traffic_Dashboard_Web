import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InferType, number, object, string } from "yup";
import client from "./axiosClient";

const schema = object({
  bootId: string().required(),
  map: number().required(),
  mission: number().required(),
}).required();

type EditRevision = InferType<typeof schema>;

const getEditRevision = async () => {
  const { data } = await client.get<unknown>("api/setting/edit-revision");
  return schema.validate(data, { stripUnknown: true });
};

/** 地圖 (點位、路徑、區域) 被改過時要重讀的資料 */
const MAP_QUERY_KEYS = [
  ["map"],
  ["active-group-resources"],
  ["all-groups-resources"],
  ["loc-only"],
];

/** 任務被改過時要重讀的資料;步驟清單自己每 2 秒輪詢,不用列在這裡 */
const MISSION_QUERY_KEYS = [
  ["all-mission-title-detail"],
  ["all-mission-title"],
  ["mission-title-by-id"],
];

const POLL_MS = 2000;
/** 後端沒有這支 API (舊版) 或暫時連不上時,不用問那麼勤 */
const POLL_AFTER_ERROR_MS = 15000;

/**
 * 設定頁用:別人改了地圖或任務,這邊的畫面跟著更新。
 *
 * 地圖和列表原本只有自己存檔、按重新整理時才重讀,別人改完這邊還是舊畫面,
 * 再照舊畫面去改就會出事。整包資料每幾秒重抓太重,所以每 2 秒只問後端
 * 「被改過幾次」,數字變了才把對應的資料重讀。
 */
const useEditRevisionSync = () => {
  const queryClient = useQueryClient();
  const seen = useRef<EditRevision | null>(null);

  const { data } = useQuery({
    queryKey: ["edit-revision"],
    queryFn: getEditRevision,
    retry: false,
    refetchInterval: (_data, query) =>
      query.state.status === "error" ? POLL_AFTER_ERROR_MS : POLL_MS,
  });

  useEffect(() => {
    if (!data) return;
    const previous = seen.current;
    seen.current = data;
    // 第一次只是記下現在的數字;畫面上的資料是剛讀的
    if (!previous) return;

    const restarted = previous.bootId !== data.bootId;
    const stale = [
      ...(restarted || previous.map !== data.map ? MAP_QUERY_KEYS : []),
      ...(restarted || previous.mission !== data.mission
        ? MISSION_QUERY_KEYS
        : []),
    ];
    stale.forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }, [data, queryClient]);
};

export default useEditRevisionSync;
