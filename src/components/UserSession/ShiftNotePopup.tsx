import { FC, useState } from "react";
import { Button, Modal } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { SHIFT_NOTES_KEY, useShiftNotes } from "@/api/useProfile";
import { SHIFT_NOTE_CHECK_KEY } from "@/utils/session";
import ShiftNoteList from "./ShiftNoteList";

const readFlag = () => {
  try {
    return sessionStorage.getItem(SHIFT_NOTE_CHECK_KEY) === "1";
  } catch {
    return false;
  }
};

const clearFlag = () => {
  try {
    sessionStorage.removeItem(SHIFT_NOTE_CHECK_KEY);
  } catch {
    /* 沒差, 這次登入不會再跳 */
  }
};

/** 登入後有別人留的未讀交班留言就跳出來, 按「已讀」才關 */
export const useMarkShiftNotesRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => client.post("api/profile/shift-notes/read"),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHIFT_NOTES_KEY }),
  });
};

const ShiftNotePopup: FC = () => {
  const { t } = useTranslation();
  const [check, setCheck] = useState(readFlag);
  const { data } = useShiftNotes();
  const markRead = useMarkShiftNotesRead();

  if (!check || !data) return null;
  const unread = data.notes.filter((n) => n.unread);
  if (unread.length === 0) {
    clearFlag();
    return null;
  }

  const done = () => {
    markRead.mutate(undefined, {
      onSettled: () => {
        clearFlag();
        setCheck(false);
      },
    });
  };

  return (
    <Modal
      open
      title={t("profile.shift.popup_title", { count: unread.length })}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={
        <Button type="primary" loading={markRead.isLoading} onClick={done}>
          {t("profile.shift.mark_read")}
        </Button>
      }
    >
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <ShiftNoteList notes={unread} />
      </div>
    </Modal>
  );
};

export default ShiftNotePopup;
