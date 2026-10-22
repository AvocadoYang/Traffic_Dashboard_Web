import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App as AntdApp, Button, Empty, Modal as AntdModal, Spin } from "antd";
import { ImportOutlined, PlusOutlined, CopyOutlined } from "@ant-design/icons";
import Layout, { Content } from "antd/es/layout/layout";
import { useAtomValue, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Header from "@/components/Header";
import { fileUrl, useProjects } from "./api/simV2Api";
import EditorCanvas from "./editor/EditorCanvas";
import HintBar from "./editor/HintBar";
import PropertiesPanel from "./editor/PropertiesPanel";
import StatusBar from "./editor/StatusBar";
import Toolbar from "./editor/Toolbar";
import BackgroundModal from "./editor/BackgroundModal";
import CalibrateModal from "./editor/CalibrateModal";
import { isTypingTarget, useEditorShortcuts } from "./editor/shortcuts";
import NewProjectModal, { NewProjectSource } from "./components/NewProjectModal";
import ProjectBar, { ProjectAction } from "./components/ProjectBar";
import { ConflictModal, LeaveModal, NameModal } from "./components/Dialogs";
import { lastProject, useProjectSession } from "./components/useProjectSession";
import { docAtom, isDirtyAtom, projectAtom, redoAtom, undoAtom, workspaceTabAtom } from "./state/editorAtoms";
import VehiclesTab from "./setup/VehiclesTab";
import DemandTab from "./setup/DemandTab";
import RunWorkspace from "./run/RunWorkspace";

const StyledLayout = styled(Layout)`
  height: var(--app-height);
  overflow: hidden;
`;

const Body = styled(Content)`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--c-bg-muted);
`;

const Shell = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 300px;
  grid-template-rows: minmax(0, 1fr) auto;
  outline: none;

  > .toolbar {
    grid-row: 1 / 3;
  }
  > .canvas {
    position: relative;
    min-height: 0;
  }
  > .panel {
    grid-column: 3;
    grid-row: 1 / 3;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  > .panel > * {
    flex: 1 1 auto;
  }

  @media (max-width: 900px) {
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(320px, 1fr) auto minmax(0, 40vh);
    > .panel {
      grid-column: 1 / -1;
      grid-row: 3;
    }
  }
`;

const Center = styled.div`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const EmptyCard = styled.div`
  max-width: 560px;
  padding: 32px;
  text-align: center;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;

  h3 {
    margin: 0 0 8px;
    color: var(--c-text);
  }
  p {
    margin: 0 0 20px;
    color: var(--c-text-secondary);
  }
`;

const Workspace: FC<{ projectId: string; active: boolean }> = ({ projectId, active }) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const shortcuts = useEditorShortcuts();
  const doc = useAtomValue(docAtom);
  const [bgOpen, setBgOpen] = useState(false);
  const bgUrl = doc.background ? fileUrl(projectId, doc.background.fileId) : null;
  // capture: antd 的下拉選單會 stopPropagation, 焦點留在選單上時 bubble 收不到.
  // 只有在佈局分頁才有快捷鍵 (不然在需求表按 Delete 會刪到地圖上選取的點位)
  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", shortcuts, true);
    return () => window.removeEventListener("keydown", shortcuts, true);
  }, [shortcuts, active]);
  return (
    <Shell ref={shellRef} tabIndex={-1} data-testid="simv2-shell" style={active ? undefined : { display: "none" }}>
      <div className="toolbar" style={{ display: "flex" }}>
        <Toolbar onOpenBackground={() => setBgOpen(true)} />
      </div>
      <div
        className="canvas"
        onPointerDownCapture={(e) => {
          if (!isTypingTarget(e.target)) shellRef.current?.focus({ preventScroll: true });
        }}
      >
        <EditorCanvas backgroundUrl={bgUrl} projectId={projectId} />
        <HintBar />
      </div>
      <StatusBar />
      <div className="panel">
        <PropertiesPanel />
      </div>
      <BackgroundModal open={bgOpen} projectId={projectId} onClose={() => setBgOpen(false)} />
      <CalibrateModal />
    </Shell>
  );
};

const SimulateV2Page: FC = () => {
  const { t } = useTranslation();
  const store = useStore();
  const projects = useProjects();
  const session = useProjectSession();
  const project = useAtomValue(projectAtom);
  const tab = useAtomValue(workspaceTabAtom);
  const [newOpen, setNewOpen] = useState<NewProjectSource | null>(null);
  const [nameModal, setNameModal] = useState<null | "info" | "copy">(null);
  /** 換專案前有沒存的修改: 先問 */
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const guard = useCallback(
    (action: () => void) => {
      if (store.get(isDirtyAtom)) setPending(() => action);
      else action();
    },
    [store],
  );

  // 第一次進來: 打開上次的專案 (或最新的). 從別頁切回來時編輯中的內容還在, 不要蓋掉
  const { open } = session;
  useEffect(() => {
    if (!projects.data) return;
    const current = store.get(projectAtom);
    if (current && projects.data.some((p) => p.id === current.id)) return;
    const last = lastProject();
    const pick = projects.data.find((p) => p.id === last) ?? projects.data[0];
    if (pick) void open(pick.id);
  }, [projects.data, open, store]);

  // Ctrl+S 存檔; 有沒存的修改時關分頁要先問
  const { save } = session;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (store.get(isDirtyAtom)) void save();
        return;
      }
      // 佈局分頁的復原 / 重做在編輯器的快捷鍵裡; 其他分頁 (不是在輸入框裡) 也可以按
      if (store.get(workspaceTabAtom) === "layout" || !(e.ctrlKey || e.metaKey) || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.set(undoAtom);
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        store.set(redoAtom);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!store.get(isDirtyAtom)) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [save, store]);

  const onAction = (action: ProjectAction) => {
    if (action === "new") guard(() => setNewOpen("blank"));
    else if (action === "info" || action === "copy") setNameModal(action);
    else if (action === "export") void session.exportFile();
    else if (action === "delete") {
      setPending(null);
      setDeleteOpen(true);
    }
  };

  const list = useMemo(() => projects.data ?? [], [projects.data]);

  let body;
  if (project) {
    // 佈局一直掛著 (切回來時畫面、選取都還在), 其他分頁切到才掛上去
    body = (
      <>
        <Workspace projectId={project.id} active={tab === "layout"} />
        {tab === "vehicles" && <VehiclesTab />}
        {tab === "demand" && <DemandTab />}
        {tab === "run" && <RunWorkspace />}
      </>
    );
  } else if (projects.isError) {
    body = (
      <Center>
        <EmptyCard data-testid="simv2-load-error">
          <h3>{t("sim_v2.empty.load_failed")}</h3>
          <p>{String((projects.error as Error)?.message ?? "")}</p>
          <Button onClick={() => void projects.refetch()}>{t("sim_v2.empty.retry")}</Button>
        </EmptyCard>
      </Center>
    );
  } else if (projects.isLoading || session.busy === "open") {
    body = (
      <Center>
        <Spin />
      </Center>
    );
  } else {
    body = (
      <Center>
        <EmptyCard data-testid="simv2-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
          <h3>{t("sim_v2.empty.title")}</h3>
          <p>{t("sim_v2.empty.body")}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen("blank")}>
              {t("sim_v2.new.blank")}
            </Button>
            <Button icon={<CopyOutlined />} onClick={() => setNewOpen("site")}>
              {t("sim_v2.new.site")}
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => setNewOpen("file")}>
              {t("sim_v2.new.file")}
            </Button>
          </div>
        </EmptyCard>
      </Center>
    );
  }

  return (
    <StyledLayout>
      <Header />
      <Body>
        <ProjectBar
          projects={list}
          loading={projects.isLoading}
          saving={session.busy === "save"}
          onSwitch={(id) => id !== project?.id && guard(() => void open(id))}
          onAction={onAction}
          onSave={() => void save()}
        />
        {body}
      </Body>

      <NewProjectModal
        open={newOpen !== null}
        initialSource={newOpen ?? "blank"}
        onClose={() => setNewOpen(null)}
        onCreated={(id) => {
          void session.refreshList();
          void open(id);
        }}
      />
      <NameModal
        open={nameModal === "info"}
        title={t("sim_v2.project.info")}
        initialName={project?.name ?? ""}
        initialDescription={project?.description ?? ""}
        withDescription
        onCancel={() => setNameModal(null)}
        onOk={(name, description) => void session.updateInfo(name, description).then((ok) => ok && setNameModal(null))}
      />
      <NameModal
        open={nameModal === "copy"}
        title={t("sim_v2.project.copy")}
        initialName={t("sim_v2.conflict.copy_name", { name: project?.name ?? "" })}
        busy={session.busy === "copy"}
        onCancel={() => setNameModal(null)}
        onOk={(name) => void session.saveAsNew(name).then((ok) => ok && setNameModal(null))}
      />
      <ConflictModal
        open={session.conflict}
        projectName={project?.name ?? ""}
        busy={session.busy === "copy"}
        onCancel={() => session.setConflict(false)}
        onReload={() => {
          session.setConflict(false);
          if (project) void open(project.id);
        }}
        onSaveAs={(name) => void session.saveAsNew(name)}
      />
      <LeaveModal
        open={pending !== null}
        busy={session.busy === "save"}
        onCancel={() => setPending(null)}
        onDiscard={() => {
          const next = pending;
          setPending(null);
          next?.();
        }}
        onSave={() =>
          void save().then((ok) => {
            if (!ok) return;
            const next = pending;
            setPending(null);
            next?.();
          })
        }
      />
      <AntdDeleteConfirm
        open={deleteOpen}
        name={project?.name ?? ""}
        busy={session.busy === "delete"}
        onCancel={() => setDeleteOpen(false)}
        onOk={() => void session.remove().then(() => setDeleteOpen(false))}
      />
    </StyledLayout>
  );
};

const AntdDeleteConfirm: FC<{ open: boolean; name: string; busy: boolean; onOk: () => void; onCancel: () => void }> = ({
  open,
  name,
  busy,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();
  return (
    <AntdModal open={open} title={t("sim_v2.project.delete")} onOk={onOk} onCancel={onCancel} okButtonProps={{ danger: true, loading: busy }} okText={t("sim_v2.project.delete")} cancelText={t("sim_v2.common.cancel")}>
      {t("sim_v2.project.delete_confirm", { name })}
    </AntdModal>
  );
};

/** antd 的 message / modal 要在 <App> 底下才吃得到主題 */
const SimulateV2: FC = () => (
  <AntdApp component="div" style={{ display: "contents" }}>
    <SimulateV2Page />
  </AntdApp>
);

export default SimulateV2;
