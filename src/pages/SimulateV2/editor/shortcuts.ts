import { useCallback } from "react";
import { useStore } from "jotai";
import { boundsOf, snapToGrid } from "../model/geometry";
import { Clipboard, copyItems, deleteItems, moveNodes, pasteItems } from "../model/ops";
import { Point, SimDoc } from "../model/types";
import {
  EMPTY_SELECTION,
  Tool,
  calibrationAtom,
  commitAtom,
  cursorAtom,
  docAtom,
  fitRequestAtom,
  measureAtom,
  pathDraftAtom,
  redoAtom,
  selectionAtom,
  switchToolAtom,
  toolAtom,
  undoAtom,
} from "../state/editorAtoms";

/** 剪貼簿放在模組裡: 換專案也還在, 可以在專案之間複製 */
let clipboard: Clipboard | null = null;

export const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  p: "point",
  l: "path",
  s: "station",
  w: "standby",
  m: "measure",
};

/** 焦點在可以打字的地方: 快捷鍵讓給它 */
export const isTypingTarget = (t: EventTarget | null) => {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return true;
  if (!(t instanceof HTMLInputElement)) return false;
  // antd 不能打字的下拉選單是一個 readonly 的 input: 選完之後焦點還留在那裡, Ctrl+C 之類的要照常能用;
  // 只有選單打開時方向鍵、Enter 要給它
  if (t.readOnly) return t.getAttribute("aria-expanded") === "true";
  return !["checkbox", "radio", "button", "range"].includes(t.type);
};

/** 原生和 React 的鍵盤事件都可以 */
interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/** 對話框、下拉選單裡按的鍵不算 */
const inPopup = (t: EventTarget | null) =>
  t instanceof Element && !!t.closest(".ant-modal, .ant-select-dropdown, .ant-dropdown, .ant-popover, .ant-picker-dropdown");

/** 有對話框開著時快捷鍵都不動作 (焦點不一定在對話框裡, 按 Delete 不能刪到後面畫布上的東西) */
const modalOpen = () =>
  [...document.querySelectorAll<HTMLElement>(".ant-modal-wrap")].some(
    (el) => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0,
  );

/** 編輯區的快捷鍵 (掛在 window 上, 滑鼠在畫布上不用先點一下); 在輸入框、對話框裡打字時不管 */
export function useEditorShortcuts() {
  const store = useStore();
  return useCallback(
    (e: KeyEventLike) => {
      if (isTypingTarget(e.target) || inPopup(e.target) || modalOpen()) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const selection = store.get(selectionAtom);
      const commit = (fn: (d: SimDoc) => SimDoc) => store.set(commitAtom, fn);
      const done = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      if (mod && key === "z" && !e.shiftKey) {
        store.set(undoAtom);
        return done();
      }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        store.set(redoAtom);
        return done();
      }
      if (mod && key === "c") {
        clipboard = copyItems(store.get(docAtom), selection.nodeIds, selection.pathIds);
        return done();
      }
      if (mod && key === "v") {
        if (!clipboard || clipboard.nodes.length === 0) return done();
        const doc = store.get(docAtom);
        const clip = clipboard;
        const b = boundsOf(clip.nodes);
        const cursor = store.get(cursorAtom);
        let offset: Point = { x: doc.editor.gridSize * 2, y: -doc.editor.gridSize * 2 };
        if (b && cursor) {
          const center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
          offset = { x: cursor.x - center.x, y: cursor.y - center.y };
          if (doc.editor.snap) offset = snapToGrid(offset, doc.editor.gridSize);
        }
        let pasted = { nodeIds: [] as string[], pathIds: [] as string[] };
        commit((d) => {
          const r = pasteItems(d, clip, offset);
          pasted = { nodeIds: r.nodeIds, pathIds: r.pathIds };
          return r.doc;
        });
        store.set(selectionAtom, pasted);
        return done();
      }
      if (mod && key === "a") {
        const doc = store.get(docAtom);
        store.set(selectionAtom, { nodeIds: doc.nodes.map((n) => n.id), pathIds: doc.paths.map((p) => p.id) });
        return done();
      }
      if (key === "delete" || key === "backspace") {
        if (selection.nodeIds.length === 0 && selection.pathIds.length === 0) return;
        commit((d) => deleteItems(d, selection.nodeIds, selection.pathIds));
        store.set(selectionAtom, EMPTY_SELECTION);
        return done();
      }
      const tool = store.get(toolAtom);
      if (key === "escape") {
        if (tool === "path" && store.get(pathDraftAtom)) store.set(pathDraftAtom, null);
        else if (tool === "measure" && store.get(measureAtom).a) store.set(measureAtom, { a: null, b: null });
        else if (tool === "calibrate" && store.get(calibrationAtom).a) store.set(calibrationAtom, { a: null, b: null });
        else if (tool !== "select") store.set(switchToolAtom, "select");
        else store.set(selectionAtom, EMPTY_SELECTION);
        return done();
      }
      if (key === "enter" && tool === "path") {
        store.set(pathDraftAtom, null);
        return done();
      }
      if (key.startsWith("arrow") && selection.nodeIds.length > 0) {
        const step = e.shiftKey ? 1 : 0.1;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowdown" ? -step : key === "arrowup" ? step : 0;
        const doc = store.get(docAtom);
        const ids = new Set(selection.nodeIds);
        const positions = new Map<string, Point>();
        for (const n of doc.nodes) if (ids.has(n.id)) positions.set(n.id, { x: n.x + dx, y: n.y + dy });
        commit((d) => moveNodes(d, positions));
        return done();
      }
      if (mod || e.altKey) return;
      if (key === "f") {
        store.set(fitRequestAtom, (n) => n + 1);
        return done();
      }
      const next = TOOL_KEYS[key];
      if (next) {
        store.set(switchToolAtom, next);
        return done();
      }
    },
    [store],
  );
}
