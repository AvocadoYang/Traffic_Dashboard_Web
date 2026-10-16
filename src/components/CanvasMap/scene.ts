import type { MapType } from "@/api/useMap";
import { isMirAreaType } from "@/pages/Setting/mapComponents/components/AllLocation/components/MirAreaTypeMarker";
import {
  isPointAreaType,
  isStandbyAreaType,
} from "@/pages/Setting/mapComponents/components/AllLocation/pointAreaTypes";

/**
 * 地圖上不常變的東西 (點位、路線、區域、標註), 換成底圖像素先算好。
 * 只有地圖資料換了才重算, 每一幀畫的時候不用再對每個點做座標換算。
 */

export type ScenePoint = {
  id: string;
  x: number;
  y: number;
  areaType: string;
  canRotate: boolean;
  standby: boolean;
  /** MiR 類型畫成圖示 (public/<areaType>.png), 其他是小圓點 */
  mir: boolean;
  rotate: number;
};

export type SceneRoad = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  oneWay: boolean;
  priority: number;
  disabled: boolean;
  limit: boolean;
};

export type SceneZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  disabled: boolean;
};

export type SceneAnnotation = {
  id: string;
  kind: "text" | "rect";
  text: string;
  x: number;
  y: number;
  /** 框線的右下角; 文字是 null */
  x2: number | null;
  y2: number | null;
  fontSize: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
  fillColor: string;
  borderWidth: number;
  rotation: number;
};

export type MapScene = {
  width: number;
  height: number;
  resolution: number;
  /** ROS 座標 (公尺) -> 底圖像素 */
  toPx: (x: number, y: number) => [number, number];
  points: ScenePoint[];
  roads: SceneRoad[];
  zones: SceneZone[];
  annotations: SceneAnnotation[];
};

export const buildScene = (map: MapType): MapScene => {
  const { mapOriginX: ox, mapOriginY: oy, mapResolution: res, mapHeight } = map;
  const toPx = (x: number, y: number): [number, number] => [
    (x - ox) / res,
    mapHeight - (y - oy) / res,
  ];

  const points = map.locations
    .filter(({ areaType }) => isPointAreaType(areaType))
    .map((loc) => {
      const [x, y] = toPx(loc.x, loc.y);
      return {
        id: loc.locationId.toString(),
        x,
        y,
        areaType: loc.areaType,
        canRotate: !!loc.canRotate,
        standby: isStandbyAreaType(loc.areaType),
        mir: isMirAreaType(loc.areaType),
        rotate: loc.rotate ?? 0,
      };
    });

  const roads = (map.roads ?? []).map((r) => {
    const [x1, y1] = toPx(r.x1, r.y1);
    const [x2, y2] = toPx(r.x2, r.y2);
    return {
      id: r.roadId,
      x1,
      y1,
      x2,
      y2,
      oneWay: r.roadType === "oneWayRoad",
      priority: r.priority,
      disabled: r.disabled,
      limit: !!r.limit,
    };
  });

  const zones = map.zones.map((z) => {
    const [sx, sy] = toPx(z.startPoint.startX, z.startPoint.startY);
    const [ex, ey] = toPx(z.endPoint.endX, z.endPoint.endY);
    return {
      id: z.id,
      name: z.name,
      x: Math.min(sx, ex),
      y: Math.min(sy, ey),
      w: Math.abs(ex - sx),
      h: Math.abs(ey - sy),
      color: z.backgroundColor,
      disabled: !!z.disabled,
    };
  });

  const annotations = map.annotations.map((a) => {
    const [x, y] = toPx(a.x, a.y);
    const corner = a.kind === "rect" ? toPx(a.x2 ?? a.x, a.y2 ?? a.y) : null;
    return {
      id: a.id,
      kind: a.kind,
      text: a.text,
      x,
      y,
      x2: corner ? corner[0] : null,
      y2: corner ? corner[1] : null,
      fontSize: a.fontSize,
      color: a.color,
      backgroundColor: a.backgroundColor,
      borderColor: a.borderColor,
      fillColor: a.fillColor,
      borderWidth: a.borderWidth,
      rotation: a.rotation ?? 0,
    };
  });

  return {
    width: map.mapWidth,
    height: map.mapHeight,
    resolution: res,
    toPx,
    points,
    roads,
    zones,
    annotations,
  };
};
