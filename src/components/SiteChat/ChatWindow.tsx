import { FC, KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Popconfirm } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import {
  CompressOutlined,
  DeleteOutlined,
  DownOutlined,
  ExpandOutlined,
  MessageOutlined,
  MinusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import {
  CHAT_API,
  CHAT_KEY,
  CHAT_MAX_LENGTH,
  CHAT_PAGE_SIZE,
  ChatMessage,
  chatDraftAtom,
  chatExpandedAtom,
  chatLimitAtom,
  useSiteChat,
} from "@/api/useSiteChat";
import ClientNameModal from "@/components/ClientNameModal";
import { AccountAvatar } from "@/components/UserAvatar/UserAvatar";
import { clientNameAtom } from "@/utils/clientIdentity";

/**
 * 要蓋過 antd Splitter 的收合鈕 (1000), 又要在對話框 (也是 1000, 掛在 body) 之下:
 * 所以一樣用 1000, 靠 DOM 順序分先後, SiteChat 要放在頁面內容後面 (見 App.tsx)。
 * 系統告警是 10000, 一直在最上面
 */
export const CHAT_Z_INDEX = 1000;
/** 離底部這麼近就算在看最新的訊息 (px) */
const NEAR_BOTTOM = 40;
/** 同一台電腦幾分鐘內連續講的話不重複顯示頭像和名字 */
const GROUP_MINUTES = 5;

const Panel = styled.section<{ $expanded: boolean }>`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: ${CHAT_Z_INDEX};
  display: flex;
  flex-direction: column;
  width: ${({ $expanded }) => ($expanded ? "min(720px, calc(100vw - 32px))" : "min(360px, calc(100vw - 32px))")};
  height: ${({ $expanded }) => ($expanded ? "min(760px, calc(100vh - 32px))" : "min(520px, calc(100vh - 32px))")};
  overflow: hidden;
  background: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);

  @media (max-width: 600px) {
    inset: 0;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }
`;

const TitleBar = styled.header`
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  color: var(--c-on-accent);
  background: var(--c-accent);

  h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: var(--font-lg);
    font-weight: 600;
    color: inherit;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const TitleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 14px;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;

  &:hover {
    background: rgba(127, 127, 127, 0.3);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
  }
`;

const ExpandButton = styled(TitleButton)`
  @media (max-width: 600px) {
    display: none;
  }
`;

const List = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-height: 0;
  padding: var(--space-md);
  overflow-y: auto;
  background: var(--c-bg-subtle);
`;

const CenterNote = styled.div`
  flex: none;
  padding: var(--space-xs) 0;
  font-size: var(--font-xs);
  color: var(--c-text-muted);
  text-align: center;
`;

const Divider = styled.div<{ $accent?: boolean }>`
  display: flex;
  flex: none;
  gap: var(--space-sm);
  align-items: center;
  margin: var(--space-sm) 0;
  font-size: var(--font-xs);
  color: ${({ $accent }) => ($accent ? "var(--c-header-accent)" : "var(--c-text-muted)")};

  &::before,
  &::after {
    flex: 1;
    height: 1px;
    content: "";
    background: currentColor;
    opacity: 0.35;
  }
`;

const Row = styled.div<{ $mine: boolean; $first: boolean }>`
  display: flex;
  flex: none;
  flex-direction: ${({ $mine }) => ($mine ? "row-reverse" : "row")};
  gap: var(--space-sm);
  margin-top: ${({ $first }) => ($first ? "var(--space-sm)" : "0")};
`;

const AvatarSlot = styled.div`
  flex: none;
  width: 28px;
`;

const Body = styled.div<{ $mine: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  min-width: 0;
  max-width: 78%;
`;

const Sender = styled.div`
  max-width: 100%;
  margin-bottom: 2px;
  overflow: hidden;
  font-size: var(--font-sm);
  color: var(--c-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BubbleLine = styled.div<{ $mine: boolean }>`
  display: flex;
  flex-direction: ${({ $mine }) => ($mine ? "row-reverse" : "row")};
  gap: var(--space-xs);
  align-items: flex-end;
  max-width: 100%;
`;

const Bubble = styled.div<{ $mine: boolean }>`
  min-width: 0;
  padding: 6px 10px;
  font-size: var(--font-md);
  line-height: 1.45;
  color: ${({ $mine }) => ($mine ? "var(--c-on-accent)" : "var(--c-text)")};
  word-break: break-word;
  white-space: pre-wrap;
  background: ${({ $mine }) => ($mine ? "var(--c-accent)" : "var(--c-bg)")};
  border: 1px solid ${({ $mine }) => ($mine ? "var(--c-accent)" : "var(--c-border)")};
  border-radius: 8px;
`;

const Side = styled.div<{ $mine: boolean }>`
  display: flex;
  flex: none;
  flex-direction: ${({ $mine }) => ($mine ? "row-reverse" : "row")};
  gap: 2px;
  align-items: center;
  font-size: var(--font-xs);
  color: var(--c-text-muted);
`;

const DeleteButton = styled.button`
  padding: 0 2px;
  font-size: 12px;
  color: var(--c-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  opacity: 0;

  ${Row}:hover &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    color: var(--c-danger);
  }

  @media (hover: none) {
    opacity: 1;
  }
`;

const JumpButton = styled.button`
  position: absolute;
  bottom: 100%;
  left: 50%;
  z-index: 1;
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  padding: 4px 12px;
  margin-bottom: var(--space-sm);
  font-size: var(--font-sm);
  color: var(--c-on-accent);
  white-space: nowrap;
  cursor: pointer;
  background: var(--c-accent);
  border: none;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transform: translateX(-50%);
`;

const Composer = styled.footer`
  position: relative;
  flex: none;
  padding: var(--space-sm) var(--space-md);
  background: var(--c-bg);
  border-top: 1px solid var(--c-border);
`;

const ComposerRow = styled.div`
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
`;

const NameHint = styled.div`
  margin-bottom: var(--space-xs);
  font-size: var(--font-xs);
  color: var(--c-text-muted);

  button {
    padding: 0;
    margin-left: var(--space-xs);
    color: var(--c-header-accent);
    cursor: pointer;
    background: none;
    border: none;
  }
`;

const useDocumentVisible = () => {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
};

const senderOf = (m: ChatMessage) => (m.clientName ? `${m.account}・${m.clientName}` : m.account);

const sameDay = (a: string, b: string) => dayjs(a).isSame(b, "day");

/** 接在上一則後面: 同一個人、同一天、幾分鐘內 */
const continues = (prev: ChatMessage | undefined, m: ChatMessage) =>
  !!prev &&
  prev.mine === m.mine &&
  senderOf(prev) === senderOf(m) &&
  sameDay(prev.time, m.time) &&
  dayjs(m.time).diff(prev.time, "minute") < GROUP_MINUTES;

type Props = {
  messageApi: MessageInstance;
  onMinimize: () => void;
};

/** 聊天視窗: 打開時在看, 所以新訊息直接算已讀 (分頁在背景時不算) */
const ChatWindow: FC<Props> = ({ messageApi, onMinimize }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useSiteChat();
  const [expanded, setExpanded] = useAtom(chatExpandedAtom);
  const [draft, setDraft] = useAtom(chatDraftAtom);
  const setLimit = useSetAtom(chatLimitAtom);
  const clientName = useAtomValue(clientNameAtom);
  const setClientName = useSetAtom(clientNameAtom);
  const [naming, setNaming] = useState(false);
  const [newBelow, setNewBelow] = useState(false);
  /** 第一則未讀; undefined = 訊息還沒進來。已讀後分隔線要留著, 所以打開時記下來 */
  const [firstUnreadId, setFirstUnreadId] = useState<string | null | undefined>(undefined);
  const visible = useDocumentVisible();

  const listRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  /** 載入更早的訊息前的內容高度, 載完用來維持看到的位置 */
  const heightBeforeLoad = useRef<number | null>(null);
  const newestSeen = useRef("");

  const messages = useMemo(() => [...(data?.notes ?? [])].reverse(), [data?.notes]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: CHAT_KEY });

  const scrollToBottom = () => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    atBottom.current = true;
    setNewBelow(false);
  };

  const onScroll = () => {
    const list = listRef.current;
    if (!list) return;
    atBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM;
    if (atBottom.current) setNewBelow(false);
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!data || !list) return;
    const newest = messages[messages.length - 1];

    if (firstUnreadId === undefined) {
      setFirstUnreadId(messages.find((m) => m.unread)?.id ?? null);
      newestSeen.current = newest?.time ?? "";
      return;
    }
    if (heightBeforeLoad.current !== null) {
      list.scrollTop += list.scrollHeight - heightBeforeLoad.current;
      heightBeforeLoad.current = null;
      return;
    }
    // 只有比看過的新才算新訊息, 刪掉最後一則不算
    if (!newest || newest.time <= newestSeen.current) return;
    newestSeen.current = newest.time;
    if (atBottom.current || newest.mine) scrollToBottom();
    else setNewBelow(true);
  }, [data, messages, firstUnreadId]);

  // 打開時停在第一則未讀, 沒有未讀就在最新的訊息
  useLayoutEffect(() => {
    if (firstUnreadId === undefined) return;
    if (firstUnreadId && dividerRef.current) dividerRef.current.scrollIntoView({ block: "start" });
    else scrollToBottom();
  }, [firstUnreadId]);

  useLayoutEffect(() => {
    if (atBottom.current) scrollToBottom();
  }, [expanded]);

  // 關掉視窗後按鈕和頁首只要未讀數, 不用一直抓那麼多則
  useEffect(() => () => setLimit(CHAT_PAGE_SIZE), [setLimit]);

  const unread = data?.unread ?? 0;
  const markRead = useMutation({
    mutationFn: () => client.post(`${CHAT_API}/read`),
    onSuccess: () => void refresh(),
  });
  const { mutate: sendRead } = markRead;
  useEffect(() => {
    if (visible && unread > 0) sendRead();
  }, [visible, unread, sendRead]);

  const send = useMutation({
    mutationFn: (content: string) => client.post(CHAT_API, { content }),
    onSuccess: () => {
      setDraft("");
      void refresh();
    },
    onError: () => void messageApi.error(t("chat.send_failed")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => client.delete(`${CHAT_API}/${encodeURIComponent(id)}`),
    onSuccess: () => void refresh(),
    onError: () => void messageApi.error(t("chat.delete_failed")),
  });

  const submit = () => {
    const content = draft.trim();
    if (content && !send.isLoading) send.mutate(content);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 中文輸入法選字時的 Enter 不是送出
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    submit();
  };

  const dayLabel = (time: string) => {
    if (dayjs(time).isSame(dayjs(), "day")) return t("chat.today");
    if (dayjs(time).isSame(dayjs().subtract(1, "day"), "day")) return t("chat.yesterday");
    return dayjs(time).format("MM/DD");
  };

  return (
    <Panel $expanded={expanded} aria-label={t("chat.title")}>
      <TitleBar>
        <MessageOutlined />
        <h2>{t("chat.title")}</h2>
        <ExpandButton
          type="button"
          title={expanded ? t("chat.restore") : t("chat.expand")}
          aria-label={expanded ? t("chat.restore") : t("chat.expand")}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <CompressOutlined /> : <ExpandOutlined />}
        </ExpandButton>
        <TitleButton type="button" title={t("chat.minimize")} aria-label={t("chat.minimize")} onClick={onMinimize}>
          <MinusOutlined />
        </TitleButton>
      </TitleBar>

      <List ref={listRef} onScroll={onScroll}>
        {data?.hasMore ? (
          <Button
            type="link"
            size="small"
            onClick={() => {
              heightBeforeLoad.current = listRef.current?.scrollHeight ?? null;
              setLimit((n) => n + CHAT_PAGE_SIZE);
            }}
          >
            {t("chat.load_more")}
          </Button>
        ) : (
          data && <CenterNote>{t(messages.length ? "chat.keep_hint" : "chat.empty")}</CenterNote>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || !sameDay(prev.time, m.time);
          const isFirstUnread = m.id === firstUnreadId;
          const first = !continues(prev, m) || isFirstUnread;
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {newDay && <Divider>{dayLabel(m.time)}</Divider>}
              {isFirstUnread && (
                <Divider $accent ref={dividerRef}>
                  {t("chat.unread_divider")}
                </Divider>
              )}
              <Row $mine={m.mine} $first={first}>
                {!m.mine && <AvatarSlot>{first && <AccountAvatar account={m.account} size={28} />}</AvatarSlot>}
                <Body $mine={m.mine}>
                  {first && !m.mine && <Sender title={senderOf(m)}>{senderOf(m)}</Sender>}
                  <BubbleLine $mine={m.mine}>
                    <Bubble $mine={m.mine}>{m.content}</Bubble>
                    <Side $mine={m.mine}>
                      <time dateTime={m.time}>{dayjs(m.time).format("HH:mm")}</time>
                      {m.canDelete && (
                        <Popconfirm
                          title={t("chat.delete_confirm")}
                          okText={t("utils.confirm")}
                          cancelText={t("utils.cancel")}
                          onConfirm={() => remove.mutate(m.id)}
                        >
                          <DeleteButton type="button" aria-label={t("chat.delete")} title={t("chat.delete")}>
                            <DeleteOutlined />
                          </DeleteButton>
                        </Popconfirm>
                      )}
                    </Side>
                  </BubbleLine>
                </Body>
              </Row>
            </div>
          );
        })}
      </List>

      <Composer>
        {newBelow && (
          <JumpButton type="button" onClick={scrollToBottom}>
            <DownOutlined />
            {t("chat.new_below")}
          </JumpButton>
        )}
        {!clientName && (
          <NameHint>
            {t("chat.no_client_name")}
            <button type="button" onClick={() => setNaming(true)}>
              {t("chat.set_client_name")}
            </button>
          </NameHint>
        )}
        <ComposerRow>
          <Input.TextArea
            value={draft}
            maxLength={CHAT_MAX_LENGTH}
            autoSize={{ minRows: 1, maxRows: 4 }}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            title={t("chat.newline_hint")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            aria-label={t("chat.send")}
            title={t("chat.send")}
            disabled={!draft.trim()}
            loading={send.isLoading}
            onClick={submit}
          />
        </ComposerRow>
      </Composer>
      {naming && <ClientNameModal open setOpen={setNaming} onSaved={setClientName} />}
    </Panel>
  );
};

export default ChatWindow;
