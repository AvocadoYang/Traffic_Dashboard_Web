/**
 * 專案檔 (<名稱>.simv2.json): 專案內容加上用到的檔案 (base64), 沒有連伺服器也能帶著走.
 * 匯入一律建立新專案, 檔案沿用原本的 key, doc 不用改.
 */
import { parseDoc } from "../model/migrate";
import { SimDoc } from "../model/types";
import {
  createProject,
  downloadProjectFile,
  ProjectFile,
  ProjectSummary,
  uploadProjectFile,
} from "../api/simV2Api";
import { base64ToBlob, blobToBase64 } from "./image";

const FORMAT = "fleet-core-sim-v2";
const FORMAT_VERSION = 1;

interface FileEntry {
  key: string;
  kind: ProjectFile["kind"];
  fileName: string;
  mime: string;
  data: string;
}

export interface ProjectFileJson {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  project: { name: string; description: string; doc: SimDoc };
  files: FileEntry[];
}

/** 檔名不能有的字元換掉 */
export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "project";

export async function buildProjectFile(
  projectId: string,
  meta: { name: string; description: string },
  doc: SimDoc,
  files: ProjectFile[],
): Promise<Blob> {
  const text = JSON.stringify(doc);
  const used = files.filter((f) => text.includes(f.key));
  const entries: FileEntry[] = [];
  for (const f of used) {
    const blob = await downloadProjectFile(projectId, f.key);
    entries.push({ key: f.key, kind: f.kind, fileName: f.fileName, mime: f.mime, data: await blobToBase64(blob) });
  }
  const json: ProjectFileJson = {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    project: { name: meta.name, description: meta.description, doc },
    files: entries,
  };
  return new Blob([JSON.stringify(json)], { type: "application/json" });
}

export class NotProjectFileError extends Error {}

export async function readProjectFile(file: Blob) {
  let json: Partial<ProjectFileJson>;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new NotProjectFileError("json");
  }
  if (json.format !== FORMAT || !json.project) throw new NotProjectFileError("format");
  const doc = parseDoc(json.project.doc);
  const files = (Array.isArray(json.files) ? json.files : []).filter(
    (f): f is FileEntry => !!f && typeof f.key === "string" && typeof f.data === "string",
  );
  return {
    name: String(json.project.name || "").slice(0, 100),
    description: String(json.project.description || "").slice(0, 1000),
    doc,
    files,
  };
}

export type ParsedProjectFile = Awaited<ReturnType<typeof readProjectFile>>;

export async function importProjectFile(parsed: ParsedProjectFile, name: string): Promise<ProjectSummary> {
  const created = await createProject({ name, description: parsed.description, doc: parsed.doc });
  for (const f of parsed.files) {
    await uploadProjectFile(created.id, base64ToBlob(f.data, f.mime), {
      kind: f.kind,
      fileName: f.fileName,
      key: f.key,
    });
  }
  return created;
}
