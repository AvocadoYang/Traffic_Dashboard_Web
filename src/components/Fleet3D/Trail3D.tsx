import { FC, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LiveTracks, TRAIL_MS, TrailPoint, isJump } from "./liveTracks";

/**
 * 跟著的那台車後面拖的軌跡: 最近 30 秒走過的路, 鋪在地上的一條帶子, 越舊越淡。
 * 一下子跳太遠的那段 (定位跳了, 5001 定位異常常見的樣子) 畫紅色, 一眼看得出來。
 * 最後一段接到車現在畫的位置; 每一幀照現在的資料重算 (幾百段而已)。
 */

/** 最多畫幾段 (30 秒、一秒十幾筆也夠) */
const MAX_SEGMENTS = 600;
const WIDTH = 0.18;
/** 稍微浮在地上, 不跟底圖、路線搶深度 */
const LIFT = 0.025;
const MAX_ALPHA = 0.85;
const JUMP_COLOR = new THREE.Color("#ff4d4f");

const Trail3D: FC<{ id: string; tracks: LiveTracks; color: string }> = ({ id, tracks, color }) => {
  // 每一段自己四個頂點 (顏色才能一段一段不一樣, 例如跳動那段整段紅)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_SEGMENTS * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_SEGMENTS * 4 * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const index: number[] = [];
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const a = i * 4;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(index);
    g.setDrawRange(0, 0);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const base = useMemo(() => new THREE.Color(color), [color]);

  useFrame(() => {
    const now = performance.now();
    const shown = tracks.isShown(id);
    const recorded = shown ? tracks.trailOf(id, now) : [];
    const current = tracks.positionOf(id, now);
    const points: TrailPoint[] = [...recorded];
    const last = points[points.length - 1];
    if (current && last && (current.x !== last.x || current.y !== last.y)) points.push({ x: current.x, y: current.y, t: now, seen: now });

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const from = Math.max(0, points.length - 1 - MAX_SEGMENTS);
    let n = 0;
    for (let i = from; i + 1 < points.length; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-4) continue;
      // 左右各偏半個寬度 (ROS 座標的法向量); 世界座標 z = -ROS y
      const nx = (-dy / len) * (WIDTH / 2);
      const ny = (dx / len) * (WIDTH / 2);
      const c = isJump(a, b) ? JUMP_COLOR : base;
      const v = n * 4;
      pos.setXYZ(v, a.x + nx, LIFT, -(a.y + ny));
      pos.setXYZ(v + 1, a.x - nx, LIFT, -(a.y - ny));
      pos.setXYZ(v + 2, b.x + nx, LIFT, -(b.y + ny));
      pos.setXYZ(v + 3, b.x - nx, LIFT, -(b.y - ny));
      const alphaA = MAX_ALPHA * Math.max(0, 1 - (now - a.t) / TRAIL_MS);
      const alphaB = MAX_ALPHA * Math.max(0, 1 - (now - b.t) / TRAIL_MS);
      col.setXYZW(v, c.r, c.g, c.b, alphaA);
      col.setXYZW(v + 1, c.r, c.g, c.b, alphaA);
      col.setXYZW(v + 2, c.r, c.g, c.b, alphaB);
      col.setXYZW(v + 3, c.r, c.g, c.b, alphaB);
      n++;
    }
    geometry.setDrawRange(0, n * 6);
    pos.needsUpdate = true;
    col.needsUpdate = true;
    // 包圍球每段都在變, 不做剔除比較省事
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
};

export default Trail3D;
