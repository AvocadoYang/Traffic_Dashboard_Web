import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import client from "@/api/axiosClient";

/** 後端用 successHandle 包成 { status, response } */
interface Wrapped<T> {
  status: string;
  response: T;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  rev: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  key: string;
  kind: "image" | "pdf" | "dxf";
  fileName: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  doc: unknown;
  files: ProjectFile[];
}

export const PROJECTS_KEY = ["sim-v2-projects"];

const base = "api/sim-v2/projects";

export const listProjects = async () =>
  (await client.get<Wrapped<ProjectSummary[]>>(base)).data.response;

export const getProject = async (id: string) =>
  (await client.get<Wrapped<ProjectDetail>>(`${base}/${id}`)).data.response;

export const createProject = async (body: { name: string; description?: string; doc: unknown }) =>
  (await client.post<Wrapped<ProjectSummary>>(base, body)).data.response;

export const updateProject = async (
  id: string,
  body: { rev: number; name?: string; description?: string; doc?: unknown },
) => (await client.put<Wrapped<ProjectSummary>>(`${base}/${id}`, body)).data.response;

export const deleteProject = async (id: string) => {
  await client.delete(`${base}/${id}`);
};

export const duplicateProject = async (id: string, name: string) =>
  (await client.post<Wrapped<ProjectSummary>>(`${base}/${id}/duplicate`, { name })).data.response;

export const uploadProjectFile = async (
  projectId: string,
  file: Blob,
  opts: { kind: ProjectFile["kind"]; fileName: string; key?: string },
) => {
  const form = new FormData();
  form.append("kind", opts.kind);
  form.append("fileName", opts.fileName);
  if (opts.key) form.append("key", opts.key);
  form.append("file", file, opts.fileName);
  return (await client.post<Wrapped<ProjectFile>>(`${base}/${projectId}/files`, form)).data.response;
};

export const fileUrl = (projectId: string, key: string) =>
  `${client.defaults.baseURL}/${base}/${projectId}/files/${encodeURIComponent(key)}`;

export const downloadProjectFile = async (projectId: string, key: string) =>
  (await client.get<Blob>(`${base}/${projectId}/files/${encodeURIComponent(key)}`, { responseType: "blob" })).data;

export const useProjects = () =>
  useQuery({ queryKey: PROJECTS_KEY, queryFn: listProjects });

/** 後端回的錯誤訊息; 409 代表別人先存過 */
export function apiErrorOf(err: unknown): { status: number | null; message: string } {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return { status: err.response?.status ?? null, message: data?.message ?? err.message };
  }
  return { status: null, message: err instanceof Error ? err.message : String(err) };
}

// ---------------------------------------------------------------- 結果紀錄 (sim_run)

export type RunKind = "single" | "sweep";

export interface RunMeta {
  id: string;
  kind: RunKind;
  project_rev: number;
  /** 列表顯示的幾個數字 (格式見 run/history.ts) */
  summary: unknown;
  created_at: string;
}

export interface RunDetail extends RunMeta {
  params: unknown;
  result: unknown;
}

export const runsKey = (projectId: string) => ["sim-v2-runs", projectId];

export const listRuns = async (projectId: string) =>
  (await client.get<Wrapped<RunMeta[]>>(`${base}/${projectId}/runs`)).data.response;

export const getRun = async (projectId: string, runId: string) =>
  (await client.get<Wrapped<RunDetail>>(`${base}/${projectId}/runs/${runId}`)).data.response;

export const createRun = async (
  projectId: string,
  body: { kind: RunKind; projectRev: number; params: unknown; summary: unknown; result: unknown },
) => (await client.post<Wrapped<RunMeta>>(`${base}/${projectId}/runs`, body)).data.response;

export const deleteRun = async (projectId: string, runId: string) => {
  await client.delete(`${base}/${projectId}/runs/${runId}`);
};

export const useRuns = (projectId: string | null | undefined) =>
  useQuery({ queryKey: runsKey(projectId ?? ""), queryFn: () => listRuns(projectId!), enabled: !!projectId });
