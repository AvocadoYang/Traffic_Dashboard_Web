import { useCallback, useState } from "react";
import { App } from "antd";
import { useAtom, useSetAtom, useStore } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  PROJECTS_KEY,
  apiErrorOf,
  deleteProject,
  duplicateProject,
  getProject,
  updateProject,
} from "../api/simV2Api";
import { downloadBlob } from "../io/image";
import { buildProjectFile, safeFileName } from "../io/projectFile";
import { NewerDocError, parseDoc } from "../model/migrate";
import { docAtom, fitRequestAtom, loadDocAtom, markSavedAtom, projectAtom } from "../state/editorAtoms";

/** 上次打開的專案 (只是方便, 讀不到就打開最新的) */
export const LAST_PROJECT_KEY = "simv2.lastProject";

export const rememberProject = (id: string | null) => {
  try {
    if (id) localStorage.setItem(LAST_PROJECT_KEY, id);
    else localStorage.removeItem(LAST_PROJECT_KEY);
  } catch {
    /* 私密瀏覽存不進去就算了 */
  }
};

export const lastProject = () => {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
};

/** 輸入框還沒離開的修改先寫進 doc (輸入框是離開時才寫) */
const flushFieldEdits = () => {
  const el = document.activeElement;
  if (el instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(el.tagName)) el.blur();
};

/** 打開、存檔、另存、刪除、匯出專案 */
export function useProjectSession() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const store = useStore();
  const queryClient = useQueryClient();
  const [project, setProject] = useAtom(projectAtom);
  const loadDoc = useSetAtom(loadDocAtom);
  const fit = useSetAtom(fitRequestAtom);
  const [busy, setBusy] = useState<null | "open" | "save" | "export" | "delete" | "copy">(null);
  /** 存檔時發現別人先存過 (409) */
  const [conflict, setConflict] = useState(false);

  const refreshList = useCallback(() => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }), [queryClient]);

  const open = useCallback(
    async (id: string) => {
      setBusy("open");
      try {
        const p = await getProject(id);
        const doc = parseDoc(p.doc);
        loadDoc(doc);
        setProject({ id: p.id, name: p.name, description: p.description, rev: p.rev, updated_at: p.updated_at });
        rememberProject(p.id);
        fit((n) => n + 1);
        return true;
      } catch (err) {
        message.error(err instanceof NewerDocError ? t("sim_v2.msg.newer_doc") : t("sim_v2.msg.open_failed", { reason: apiErrorOf(err).message }));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [fit, loadDoc, message, setProject, t],
  );

  const save = useCallback(async () => {
    flushFieldEdits();
    const p = store.get(projectAtom);
    if (!p) return false;
    const doc = store.get(docAtom);
    setBusy("save");
    try {
      const r = await updateProject(p.id, { rev: p.rev, doc });
      store.set(projectAtom, { ...p, rev: r.rev, updated_at: r.updated_at });
      store.set(markSavedAtom, doc);
      void refreshList();
      message.success(t("sim_v2.msg.saved"));
      return true;
    } catch (err) {
      const e = apiErrorOf(err);
      if (e.status === 409) setConflict(true);
      else message.error(t("sim_v2.msg.save_failed", { reason: e.message }));
      return false;
    } finally {
      setBusy(null);
    }
  }, [message, refreshList, store, t]);

  /** 另存成新專案: 後端先複製一份 (含底圖檔案), 再把目前畫面上的內容存進去 */
  const saveAsNew = useCallback(
    async (name: string) => {
      flushFieldEdits();
      const p = store.get(projectAtom);
      if (!p) return false;
      const doc = store.get(docAtom);
      setBusy("copy");
      try {
        const dup = await duplicateProject(p.id, name);
        const r = await updateProject(dup.id, { rev: dup.rev, doc });
        store.set(projectAtom, { id: dup.id, name: dup.name, description: dup.description, rev: r.rev, updated_at: r.updated_at });
        store.set(markSavedAtom, doc);
        rememberProject(dup.id);
        setConflict(false);
        void refreshList();
        message.success(t("sim_v2.msg.copied", { name }));
        return true;
      } catch (err) {
        message.error(t("sim_v2.msg.save_failed", { reason: apiErrorOf(err).message }));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [message, refreshList, store, t],
  );

  const updateInfo = useCallback(
    async (name: string, description: string) => {
      const p = store.get(projectAtom);
      if (!p) return false;
      try {
        const r = await updateProject(p.id, { rev: p.rev, name, description });
        store.set(projectAtom, { ...p, name: r.name, description: r.description, rev: r.rev, updated_at: r.updated_at });
        void refreshList();
        return true;
      } catch (err) {
        const e = apiErrorOf(err);
        if (e.status === 409) setConflict(true);
        else message.error(e.message);
        return false;
      }
    },
    [message, refreshList, store],
  );

  const remove = useCallback(async () => {
    const p = store.get(projectAtom);
    if (!p) return;
    setBusy("delete");
    try {
      await deleteProject(p.id);
      store.set(projectAtom, null);
      rememberProject(null);
      await refreshList();
      message.success(t("sim_v2.msg.deleted", { name: p.name }));
    } catch (err) {
      message.error(apiErrorOf(err).message);
    } finally {
      setBusy(null);
    }
  }, [message, refreshList, store, t]);

  const exportFile = useCallback(async () => {
    flushFieldEdits();
    const p = store.get(projectAtom);
    if (!p) return;
    setBusy("export");
    try {
      const detail = await getProject(p.id);
      const blob = await buildProjectFile(p.id, p, store.get(docAtom), detail.files);
      downloadBlob(blob, `${safeFileName(p.name)}.simv2.json`);
    } catch (err) {
      message.error(t("sim_v2.msg.export_failed", { reason: apiErrorOf(err).message }));
    } finally {
      setBusy(null);
    }
  }, [message, store, t]);

  return { project, busy, conflict, setConflict, open, save, saveAsNew, updateInfo, remove, exportFile, refreshList };
}

export type ProjectSession = ReturnType<typeof useProjectSession>;
