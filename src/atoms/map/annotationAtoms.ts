import { atom } from "jotai";
import type { InferType } from "yup";
import type { annotationSchema } from "@/api/schemas/mapEntities";

export type Annotation = InferType<typeof annotationSchema>;

/** 正在編輯 (或還沒存的新) 標註; id 是 null = 新的 */
export type AnnotationDraft = Omit<Annotation, "id" | "rev"> & {
  id: string | null;
  rev: string | null;
};

export type AnnotationStyle = Pick<
  Annotation,
  | "fontSize"
  | "color"
  | "backgroundColor"
  | "borderColor"
  | "fillColor"
  | "borderWidth"
>;

/** select = 點選 / 拖曳既有的; text = 點地圖放文字; rect = 在地圖上拉框 */
export type AnnotationTool = "select" | "text" | "rect";

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = {
  fontSize: 16,
  color: "#000000",
  backgroundColor: "#ffffff",
  borderColor: "#ff4d4f",
  fillColor: "",
  borderWidth: 2,
};

export const annotationToolAtom = atom<AnnotationTool>("select");

export const annotationDraftAtom = atom<AnnotationDraft | null>(null);

/** 上一次用的樣式, 新的標註沿用 */
export const annotationStyleAtom = atom<AnnotationStyle>(
  DEFAULT_ANNOTATION_STYLE,
);

export const toDraft = (a: Annotation): AnnotationDraft => ({ ...a });

/** 框線兩個角整理成 (x, y) = 左上、(x2, y2) = 右下, 縮放把手才會在右下角 */
export const normalizeRect = (d: AnnotationDraft): AnnotationDraft => {
  if (d.kind !== "rect" || d.x2 == null || d.y2 == null) return d;
  // 框線不旋轉 (後端也一律存 0)
  return {
    ...d,
    x: Math.min(d.x, d.x2),
    x2: Math.max(d.x, d.x2),
    y: Math.max(d.y, d.y2),
    y2: Math.min(d.y, d.y2),
    rotation: 0,
  };
};

const EDITABLE_FIELDS = [
  "kind",
  "text",
  "x",
  "y",
  "x2",
  "y2",
  "fontSize",
  "color",
  "backgroundColor",
  "borderColor",
  "fillColor",
  "borderWidth",
  "rotation",
] as const;

/** 草稿跟存檔的不一樣 (新的一律算有改) */
export const isDraftDirty = (
  draft: AnnotationDraft | null,
  saved: Annotation[] | undefined,
) => {
  if (!draft) return false;
  if (!draft.id) return true;
  const row = saved?.find((a) => a.id === draft.id);
  if (!row) return true;
  return EDITABLE_FIELDS.some((k) => row[k] !== draft[k]);
};
