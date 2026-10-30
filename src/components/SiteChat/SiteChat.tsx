import { FC, useEffect } from "react";
import { Badge, message } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { CHAT_KEY, chatOpenAtom, useSiteChat } from "@/api/useSiteChat";
import { io } from "@/sockets/socketConnect";
import { mq } from "@/styles/responsive";
import { CHAT_CHECK_KEY } from "@/utils/session";
import ChatWindow, { CHAT_Z_INDEX } from "./ChatWindow";

const OpenButton = styled.button`
  position: fixed;
  right: 24px;
  /* 窄螢幕首頁下方有車輛 / 任務 / 任務派發的面板, 排在它上面 */
  bottom: 160px;
  z-index: ${CHAT_Z_INDEX};
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 22px;
  color: var(--c-on-accent);
  background: var(--c-accent);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);

  ${mq.web} {
    /* 設定頁的備份按鈕在 bottom 48px, 排在它上面 */
    bottom: 104px;
  }

  &:hover {
    background: var(--c-accent-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
  }
`;

const takeLoginFlag = () => {
  try {
    const flag = sessionStorage.getItem(CHAT_CHECK_KEY) === "1";
    if (flag) sessionStorage.removeItem(CHAT_CHECK_KEY);
    return flag;
  } catch {
    return false;
  }
};

/** 有變動時重抓; socket 重連後也抓一次, 斷線期間的通知收不到 */
const useChatLiveUpdates = () => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: CHAT_KEY });
    io.on("chat-updated", refresh);
    io.on("connect", refresh);
    return () => {
      io.off("chat-updated", refresh);
      io.off("connect", refresh);
    };
  }, [queryClient]);
};

/**
 * 全案場聊天室: 登入後每一頁右下角都有, 按鈕上是未讀數。
 * 登入時有未讀就自動打開, 取代以前要按「已讀」的交班留言視窗。
 */
const SiteChat: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useAtom(chatOpenAtom);
  const { data } = useSiteChat();
  const unread = data?.unread ?? 0;
  useChatLiveUpdates();

  const loaded = !!data;
  useEffect(() => {
    if (loaded && takeLoginFlag() && unread > 0) setOpen(true);
  }, [loaded, unread, setOpen]);

  return (
    <>
      {contextHolder}
      {open ? (
        <ChatWindow messageApi={messageApi} onMinimize={() => setOpen(false)} />
      ) : (
        <OpenButton type="button" aria-label={t("chat.open")} title={t("chat.open")} onClick={() => setOpen(true)}>
          <Badge count={unread} overflowCount={99} size="small" offset={[4, -4]}>
            <MessageOutlined style={{ color: "var(--c-on-accent)", fontSize: 22 }} />
          </Badge>
        </OpenButton>
      )}
    </>
  );
};

export default SiteChat;
