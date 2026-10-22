import { FC, useState } from "react";
import { Button, Input, Space, message } from "antd";
import { CheckOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { SHIFT_NOTES_KEY, useShiftNotes } from "@/api/useProfile";
import ShiftNoteList from "@/components/UserSession/ShiftNoteList";
import { useMarkShiftNotesRead } from "@/components/UserSession/ShiftNotePopup";
import { Section } from "./parts";

const MAX_LENGTH = 1000;

/** 交班留言: 全案場一個留言板, 留 30 天 */
const ShiftTab: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const qc = useQueryClient();
  const { data, isLoading } = useShiftNotes();
  const markRead = useMarkShiftNotesRead();
  const [draft, setDraft] = useState("");

  const post = useMutation({
    mutationFn: (content: string) => client.post("api/profile/shift-notes", { content }),
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: SHIFT_NOTES_KEY });
    },
    onError: () => void messageApi.error(t("profile.save_failed")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => client.delete(`api/profile/shift-notes/${encodeURIComponent(id)}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: SHIFT_NOTES_KEY }),
    onError: () => void messageApi.error(t("profile.save_failed")),
  });

  const unread = data?.unread ?? 0;

  return (
    <>
      {contextHolder}
      <Section title={t("profile.shift.write")} hint={t("profile.shift.hint")}>
        <Input.TextArea
          rows={3}
          maxLength={MAX_LENGTH}
          showCount
          value={draft}
          placeholder={t("profile.shift.placeholder")}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Space style={{ marginTop: 28 }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={!draft.trim()}
            loading={post.isLoading}
            onClick={() => post.mutate(draft.trim())}
          >
            {t("profile.shift.post")}
          </Button>
        </Space>
      </Section>

      <Section
        title={t("profile.shift.board")}
        extra={
          <Button
            size="small"
            icon={<CheckOutlined />}
            disabled={unread === 0}
            loading={markRead.isLoading}
            onClick={() => markRead.mutate()}
          >
            {t("profile.shift.mark_all_read", { count: unread })}
          </Button>
        }
      >
        {!isLoading && (
          <ShiftNoteList notes={data?.notes ?? []} onDelete={(id) => remove.mutate(id)} deleting={remove.isLoading} />
        )}
      </Section>
    </>
  );
};

export default ShiftTab;
