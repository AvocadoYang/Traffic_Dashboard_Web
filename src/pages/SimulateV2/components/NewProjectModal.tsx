import { FC, useEffect, useState } from "react";
import { App, Button, Input, Modal, Radio, Select, Space, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useMapList from "@/api/useMapList";
import { apiErrorOf, createProject, uploadProjectFile } from "../api/simV2Api";
import { ParsedProjectFile, importProjectFile, readProjectFile } from "../io/projectFile";
import { copySiteMap } from "../io/siteMap";
import { createEmptyDoc } from "../model/defaults";
import { NewerDocError } from "../model/migrate";

export type NewProjectSource = "blank" | "site" | "file";

/** 不帶 mapId: 後端回目前使用中的那張 (地圖頁預設看到的) */
const ACTIVE_MAP = "__active__";

const Form = styled.div`
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  align-items: center;

  > .top {
    align-self: start;
    padding-top: 4px;
  }
`;

const Note = styled.div`
  color: var(--c-text-muted);
  font-size: 12px;
`;

const NewProjectModal: FC<{
  open: boolean;
  initialSource: NewProjectSource;
  onClose: () => void;
  onCreated: (id: string) => void;
}> = ({ open, initialSource, onClose, onCreated }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const maps = useMapList();
  const [source, setSource] = useState<NewProjectSource>(initialSource);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mapId, setMapId] = useState<string>(ACTIVE_MAP);
  const [file, setFile] = useState<{ fileName: string; parsed: ParsedProjectFile } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSource(initialSource);
    setName("");
    setDescription("");
    setFile(null);
  }, [open, initialSource]);

  const pickFile = async (f: File) => {
    try {
      const parsed = await readProjectFile(f);
      setFile({ fileName: f.name, parsed });
      if (!name.trim()) setName(parsed.name);
    } catch (err) {
      message.error(err instanceof NewerDocError ? t("sim_v2.msg.newer_doc") : t("sim_v2.new.not_project_file"));
    }
  };

  const create = async () => {
    const projectName = name.trim();
    if (!projectName) {
      message.error(t("sim_v2.new.need_name"));
      return;
    }
    setBusy(true);
    try {
      if (source === "blank") {
        const p = await createProject({ name: projectName, description, doc: createEmptyDoc() });
        onCreated(p.id);
      } else if (source === "site") {
        const copy = await copySiteMap(mapId === ACTIVE_MAP ? null : mapId);
        if (copy.stats.nodes === 0) {
          message.warning(t("sim_v2.new.site_empty"));
          return;
        }
        const key = `f${nanoid(16)}`;
        const doc = copy.doc.background && copy.image ? { ...copy.doc, background: { ...copy.doc.background, fileId: key } } : { ...copy.doc, background: null };
        const p = await createProject({ name: projectName, description, doc });
        if (copy.image) await uploadProjectFile(p.id, copy.image.blob, { kind: "image", fileName: copy.image.fileName, key });
        message.success(t("sim_v2.new.site_copied", copy.stats), 6);
        onCreated(p.id);
      } else {
        if (!file) {
          message.error(t("sim_v2.new.need_file"));
          return;
        }
        const p = await importProjectFile(file.parsed, projectName);
        onCreated(p.id);
      }
      onClose();
    } catch (err) {
      message.error(t("sim_v2.new.failed", { reason: apiErrorOf(err).message }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t("sim_v2.new.title")}
      onCancel={onClose}
      onOk={() => void create()}
      okText={t("sim_v2.new.create")}
      cancelText={t("sim_v2.common.cancel")}
      confirmLoading={busy}
      width={560}
      maskClosable={false}
      destroyOnHidden
    >
      <Form>
        <span>{t("sim_v2.new.source")}</span>
        <Radio.Group value={source} onChange={(e) => setSource(e.target.value)} data-testid="simv2-new-source">
          <Radio.Button value="blank">{t("sim_v2.new.blank")}</Radio.Button>
          <Radio.Button value="site" disabled={!maps.data?.length}>
            {t("sim_v2.new.site")}
          </Radio.Button>
          <Radio.Button value="file">{t("sim_v2.new.file")}</Radio.Button>
        </Radio.Group>

        {source === "site" && (
          <>
            <span>{t("sim_v2.new.map")}</span>
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Select
                value={mapId}
                loading={maps.isLoading}
                options={[
                  { value: ACTIVE_MAP, label: t("sim_v2.new.active_map") },
                  ...(maps.data ?? []).map((m) => ({
                    value: m.id,
                    label: m.map_group_name ? `${m.fileName} (${m.map_group_name})` : m.fileName,
                  })),
                ]}
                onChange={setMapId}
                style={{ width: "100%" }}
              />
              <Note>{t("sim_v2.new.site_note")}</Note>
            </Space>
          </>
        )}

        {source === "file" && (
          <>
            <span>{t("sim_v2.new.file_label")}</span>
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={(f) => {
                  void pickFile(f);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>{file ? file.fileName : t("sim_v2.new.pick_file")}</Button>
              </Upload>
              {file && (
                <Note>
                  {t("sim_v2.new.file_summary", {
                    nodes: file.parsed.doc.nodes.length,
                    paths: file.parsed.doc.paths.length,
                    files: file.parsed.files.length,
                  })}
                </Note>
              )}
            </Space>
          </>
        )}

        <span>{t("sim_v2.new.name")}</span>
        <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} data-testid="simv2-new-name" onPressEnter={() => void create()} />
        <span className="top">{t("sim_v2.new.description")}</span>
        <Input.TextArea value={description} maxLength={1000} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </Form>
    </Modal>
  );
};

export default NewProjectModal;
