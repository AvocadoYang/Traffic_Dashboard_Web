import { FC, useEffect, useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { LiveState } from "@/components/CanvasMap/liveStore";
import { yieldsTo } from "./pick";

/**
 * 畫在 3D 地面上的地圖圖層: 路線、點位、點雲。座標是 ROS (公尺), 世界座標 (x, 高度, -y)。
 * 底圖在 y = 0, 這些疊在上面一點點。
 *
 * 點位、點雲是固定螢幕大小的點, 整顆點只有一個深度, 斜著看時下半部會被前面的地面擋掉;
 * 所以不做深度測試, 排在底圖之後、車之前畫 (DOT_RENDER_ORDER), 車照樣蓋得住它們。
 */

const ROAD_Y = 0.02;
const POINT_Y = 0.03;
const CLOUD_Y = 0.05;
const DOT_RENDER_ORDER = -0.5;

export type Segment = { x1: number; y1: number; x2: number; y2: number; color?: string };

/** 一組路線, 一次畫完 (線寬是螢幕像素, 拉遠也看得到) */
export const Roads3D: FC<{ segments: Segment[]; color: string; width?: number; opacity?: number }> = ({
  segments,
  color,
  width = 2,
  opacity = 1,
}) => {
  const { points, colors } = useMemo(() => {
    const pts: [number, number, number][] = [];
    const cols: [number, number, number][] = [];
    const c = new THREE.Color();
    for (const s of segments) {
      pts.push([s.x1, ROAD_Y, -s.y1], [s.x2, ROAD_Y, -s.y2]);
      c.set(s.color ?? color);
      cols.push([c.r, c.g, c.b], [c.r, c.g, c.b]);
    }
    return { points: pts, colors: cols };
  }, [segments, color]);
  if (!points.length) return null;
  return (
    <Line
      points={points}
      // 顏色在 vertexColors (會乘上 color, 所以 color 要白色)
      color="#ffffff"
      vertexColors={colors}
      segments
      lineWidth={width}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={false}
      renderOrder={3}
    />
  );
};

let dotTexture: THREE.Texture | null = null;
const getDotTexture = () => {
  if (dotTexture) return dotTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fill();
  dotTexture = new THREE.CanvasTexture(canvas);
  return dotTexture;
};

export type Dot = { id: string; x: number; y: number; color: string };

/** 點位: 固定螢幕大小的圓點 (同 2D 地圖), 可以點 */
export const Dots3D: FC<{ dots: Dot[]; size?: number; onClick?: (id: string) => void }> = ({ dots, size = 8, onClick }) => {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(dots.length * 3);
    const col = new Float32Array(dots.length * 3);
    const c = new THREE.Color();
    dots.forEach((d, i) => {
      pos.set([d.x, POINT_Y, -d.y], i * 3);
      c.set(d.color);
      col.set([c.r, c.g, c.b], i * 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [dots]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size,
        sizeAttenuation: false,
        vertexColors: true,
        map: getDotTexture(),
        alphaTest: 0.5,
        depthTest: false,
        depthWrite: false,
      }),
    [size],
  );
  useEffect(() => () => material.dispose(), [material]);

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.index === undefined || !onClick || yieldsTo("point", e.intersections)) return;
    e.stopPropagation();
    onClick(dots[e.index].id);
  };
  return (
    <points
      geometry={geometry}
      material={material}
      renderOrder={DOT_RENDER_ORDER}
      userData={{ pick: "point" }}
      onClick={onClick ? click : undefined}
    />
  );
};

/** 每台車的點雲 (liveStore 每筆訊息換一個新陣列, 換了才重建) */
export const PointClouds3D: FC<{
  state: () => LiveState | null;
  ids: string[];
  color: (id: string) => string;
  /** MiR 不在目前地圖上的不畫 (同 2D) */
  currentMapId: string | null;
}> = ({ state, ids, color, currentMapId }) => {
  const groupRef = useRef<THREE.Group>(null);
  const clouds = useRef(new Map<string, { points: THREE.Points; src: Float32Array | null }>());

  useEffect(() => {
    const map = clouds.current;
    const group = groupRef.current;
    return () => {
      map.forEach(({ points }) => {
        group?.remove(points);
        points.geometry.dispose();
        (points.material as THREE.Material).dispose();
      });
      map.clear();
    };
  }, []);

  useFrame(() => {
    const live = state();
    const group = groupRef.current;
    if (!live || !group) return;
    for (const id of ids) {
      let cloud = clouds.current.get(id);
      const src = live.pointCloud.get(id) ?? null;
      const a = live.amrs.get(id);
      const mirMap = live.mirMapId.get(id);
      const hidden = !src || !a || a.isOverdue || (mirMap !== undefined && mirMap !== currentMapId);
      if (!cloud) {
        if (hidden) continue;
        const points = new THREE.Points(
          new THREE.BufferGeometry(),
          new THREE.PointsMaterial({ color: color(id), size: 3, sizeAttenuation: false, depthTest: false, depthWrite: false }),
        );
        points.frustumCulled = false;
        points.renderOrder = DOT_RENDER_ORDER;
        group.add(points);
        cloud = { points, src: null };
        clouds.current.set(id, cloud);
      }
      cloud.points.visible = !hidden;
      if (hidden || cloud.src === src || !src) continue;
      cloud.src = src;
      const pos = new Float32Array((src.length / 2) * 3);
      for (let i = 0, j = 0; i + 1 < src.length; i += 2, j += 3) {
        pos[j] = src[i];
        pos[j + 1] = CLOUD_Y;
        pos[j + 2] = -src[i + 1];
      }
      cloud.points.geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    }
  });

  return <group ref={groupRef} />;
};
