import { nanoid } from "nanoid";
import {
  EditorSettings,
  NodeKind,
  SIM_DOC_VERSION,
  SimDoc,
  SimNode,
  StationProps,
} from "./types";

export const DEFAULT_EDITOR: EditorSettings = {
  gridSize: 1,
  snap: true,
  defaultDirection: "two-way",
};

export const DEFAULT_STATION: StationProps = {
  type: "both",
  pickSec: 30,
  dropSec: 30,
  bufferMax: null,
};

export const createEmptyDoc = (): SimDoc => ({
  schemaVersion: SIM_DOC_VERSION,
  background: null,
  nodes: [],
  paths: [],
  groups: [],
  editor: { ...DEFAULT_EDITOR },
});

export const newId = () => nanoid(10);

/**
 * 新點位的名稱: 目前最大的數字名稱 + 1 (跟現場點位一樣用數字), 從 1 開始.
 * 一次要好幾個時傳 count, 拿到連號.
 */
export function nextNodeNames(nodes: SimNode[], count = 1): string[] {
  let max = 0;
  for (const n of nodes) {
    if (/^\d{1,9}$/.test(n.name)) max = Math.max(max, Number(n.name));
  }
  return Array.from({ length: count }, (_, i) => String(max + 1 + i));
}

/** 換點位類型: 變成站點時補上預設的站點設定, 不是站點就拿掉 */
export function withKind(node: SimNode, kind: NodeKind): SimNode {
  if (kind === "station") {
    return { ...node, kind, station: node.station ?? { ...DEFAULT_STATION } };
  }
  const { station: _station, ...rest } = node;
  return { ...rest, kind };
}
