/**
 * 從現場地圖 (/api/map) 複製一份成模擬專案: 點位、路線、地圖圖片.
 * 複製完就跟現場無關, 模擬怎麼改都不會動到現場.
 */
import client from "@/api/axiosClient";
import { createEmptyDoc, newId, withKind } from "../model/defaults";
import { pathBetween } from "../model/ops";
import { ImageBackground, NodeKind, SimDoc, SimNode, SimPath, StationType } from "../model/types";
import { imageSizeOf } from "./image";

interface SiteLocation {
  locationId: string;
  x: number;
  y: number;
  areaType: string;
}

interface SiteRoad {
  spot1Id: string;
  spot2Id: string;
  roadType: string;
  disabled?: boolean;
}

interface SiteMap {
  locations: SiteLocation[];
  roads: SiteRoad[];
  imageUrl?: string;
  mapOriginX: number;
  mapOriginY: number;
  mapResolution: number;
}

/** 會取放貨的設備類型變成站點; 包膜線入口只放貨、出口只取貨 */
const STATION_TYPES: Record<string, StationType> = {
  STORAGE: "both",
  STACK: "both",
  CONVEYOR: "both",
  PACKAGE: "both",
  PACKAGE_IN: "drop",
  PACKAGE_OUT: "pick",
  PALLETIZER: "both",
  ROBOTIC_ARM: "both",
  MIR_SHELF_POSITION: "both",
};

function kindOf(areaType: string): { kind: NodeKind; stationType?: StationType } {
  if (areaType === "STANDBY") return { kind: "standby" };
  const stationType = STATION_TYPES[areaType];
  return stationType ? { kind: "station", stationType } : { kind: "point" };
}

export interface SiteCopy {
  doc: SimDoc;
  /** 地圖圖片; 要先上傳到專案, 再把 key 填進 doc.background.fileId */
  image: { blob: Blob; fileName: string } | null;
  stats: { nodes: number; stations: number; standby: number; paths: number; skippedRoads: number };
}

export async function copySiteMap(mapId: string | null): Promise<SiteCopy> {
  const { data } = await client.get<SiteMap>("/api/map", { params: mapId ? { mapId } : undefined });
  const doc = createEmptyDoc();
  const idOf = new Map<string, string>();
  const nodes: SimNode[] = [];
  for (const loc of data.locations ?? []) {
    if (idOf.has(loc.locationId)) continue;
    const id = newId();
    idOf.set(loc.locationId, id);
    const { kind, stationType } = kindOf(loc.areaType);
    let node = withKind({ id, name: loc.locationId, x: loc.x, y: loc.y, kind: "point" }, kind);
    if (node.station && stationType) node = { ...node, station: { ...node.station, type: stationType } };
    nodes.push(node);
  }

  let next: SimDoc = { ...doc, nodes };
  const paths: SimPath[] = [];
  let skippedRoads = 0;
  for (const road of data.roads ?? []) {
    const from = idOf.get(road.spot1Id);
    const to = idOf.get(road.spot2Id);
    // 停用的路線、接不到點位的、重複的 (同兩點之間第二條) 都不帶過來
    if (road.disabled || !from || !to || from === to) {
      skippedRoads += 1;
      continue;
    }
    const candidate = { ...next, paths };
    if (pathBetween(candidate, from, to)) {
      skippedRoads += 1;
      continue;
    }
    // 單向路線是 spot1 -> spot2 (跟交管一樣)
    paths.push({
      id: newId(),
      from,
      to,
      direction: road.roadType === "oneWayRoad" ? "one-way" : "two-way",
      maxSpeed: null,
    });
  }
  next = { ...next, paths };

  let image: SiteCopy["image"] = null;
  if (data.imageUrl) {
    const url = `${client.defaults.baseURL}/${data.imageUrl.replace(/^\/+/, "")}`;
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const size = await imageSizeOf(blob);
      const fileName = decodeURIComponent(data.imageUrl.split("/").pop() || "site-map.png");
      image = { blob, fileName };
      const background: ImageBackground = {
        kind: "image",
        fileId: "",
        fileName,
        source: "site",
        widthPx: size.width,
        heightPx: size.height,
        originX: data.mapOriginX,
        originY: data.mapOriginY,
        metersPerPx: data.mapResolution,
        opacity: 0.7,
        locked: true,
        calibrated: true,
      };
      next = { ...next, background };
    }
  }

  return {
    doc: next,
    image,
    stats: {
      nodes: nodes.length,
      stations: nodes.filter((n) => n.kind === "station").length,
      standby: nodes.filter((n) => n.kind === "standby").length,
      paths: paths.length,
      skippedRoads,
    },
  };
}
