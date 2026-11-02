import { useQuery } from "@tanstack/react-query";
import { atom, useAtomValue } from "jotai";
import { getToken } from "@/utils/session";
import client from "./axiosClient";

/**
 * 全案場聊天室 (原本的交班留言)。訊息保留 30 天。
 * 開關、放大、草稿放 atom: ProtectedRoute 會跟著 App 重建 (例如換語言),
 * 放元件裡的話視窗會被關掉、打到一半的字會不見。
 */
export type ChatMessage = {
  id: string;
  time: string;
  account: string;
  /** 從哪台電腦送的; 舊的留言或沒取名的電腦是 null */
  clientName: string | null;
  content: string;
  /** 這台電腦用這個帳號送的 */
  mine: boolean;
  unread: boolean;
  canDelete: boolean;
};

export type ChatData = {
  /** 新的在前面 */
  notes: ChatMessage[];
  unread: number;
  hasMore: boolean;
};

export const CHAT_KEY = ["site-chat"] as const;
export const CHAT_PAGE_SIZE = 100;
export const CHAT_MAX_LENGTH = 1000;
export const CHAT_API = "api/profile/shift-notes";

export const chatOpenAtom = atom(false);
export const chatExpandedAtom = atom(false);
export const chatDraftAtom = atom("");
export const chatLimitAtom = atom(CHAT_PAGE_SIZE);

export const useSiteChat = () => {
  const limit = useAtomValue(chatLimitAtom);
  return useQuery({
    queryKey: [...CHAT_KEY, limit],
    queryFn: async () => (await client.get<ChatData>(CHAT_API, { params: { limit } })).data,
    enabled: !!getToken(),
    keepPreviousData: true,
    // 平常靠 socket 的 chat-updated, 這裡是 socket 斷掉時的備援
    refetchInterval: 60_000,
    retry: false,
  });
};
