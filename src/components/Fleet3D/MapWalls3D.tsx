import { FC, useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 把底圖上的黑色障礙物 (SLAM 掃出來的牆) 拉成立體的牆。
 *
 * 讀底圖的像素, 亮度低於門檻的算障礙, 同一列連續的像素合成一段、上下列相同範圍的段再合併成一塊,
 * 一塊畫一個方塊 (InstancedMesh), 掃圖的牆是長直線, 合併後方塊數很少。
 * 方塊太多 (雜訊很多的圖) 時只畫前 MAX_BOXES 塊, 避免拖慢畫面。
 */

type Props = {
  url: string;
  heightPx: number;
  originX: number;
  originY: number;
  metersPerPx: number;
  color: string;
  /** 牆高 (公尺) */
  height?: number;
};

const DARK_LUMA = 90;
const MAX_BOXES = 60000;

type Box = { x0: number; x1: number; y0: number; y1: number };

/** 像素 -> 方塊: 回傳每塊的 [x0, x1) × [y0, y1) 像素範圍 */
export const mergeDarkPixels = (data: Uint8ClampedArray, w: number, h: number, limit = MAX_BOXES): Box[] => {
  const done: Box[] = [];
  let open = new Map<number, Box>(); // key = x0 * (w + 1) + x1
  for (let y = 0; y < h; y++) {
    const next = new Map<number, Box>();
    let x = 0;
    while (x < w) {
      const i = (y * w + x) * 4;
      const dark = data[i + 3] > 0 && 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < DARK_LUMA;
      if (!dark) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < w) {
        const j = (y * w + x) * 4;
        if (!(data[j + 3] > 0 && 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2] < DARK_LUMA)) break;
        x++;
      }
      const key = x0 * (w + 1) + x;
      const prev = open.get(key);
      if (prev) {
        prev.y1 = y + 1;
        next.set(key, prev);
        open.delete(key);
      } else {
        next.set(key, { x0, x1: x, y0: y, y1: y + 1 });
      }
    }
    for (const b of open.values()) done.push(b);
    open = next;
    if (done.length + open.size > limit) break;
  }
  for (const b of open.values()) done.push(b);
  return done.slice(0, limit);
};

const MapWalls3D: FC<Props> = ({ url, heightPx, originX, originY, metersPerPx, color, height = 1 }) => {
  const invalidate = useThree((s) => s.invalidate);
  const [boxes, setBoxes] = useState<Box[]>([]);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous"; // 後端有開 CORS (同底圖貼圖), 沒有的話讀不到像素, 就不畫牆
    img.onload = () => {
      if (!alive) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const { data, width, height: h } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setBoxes(mergeDarkPixels(data, width, h));
      } catch (e) {
        console.warn("3D 牆壁讀不到底圖像素:", e);
      }
    };
    img.onerror = () => console.warn("3D 牆壁底圖載入失敗:", url);
    img.src = url;
    return () => {
      alive = false;
      setBoxes([]);
    };
  }, [url]);

  const mesh = useMemo(() => {
    if (!boxes.length) return null;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0); // 底面在 y = 0
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
    const m = new THREE.InstancedMesh(geo, mat, boxes.length);
    // 圖片的列 0 在最上面 (y 最大); 圖片實際大小可能跟後端記的寬高一樣, 用實際像素比例換算
    const dummy = new THREE.Object3D();
    const imgH = heightPx;
    boxes.forEach((b, i) => {
      const sx = (b.x1 - b.x0) * metersPerPx;
      const sz = (b.y1 - b.y0) * metersPerPx;
      const cx = originX + ((b.x0 + b.x1) / 2) * metersPerPx;
      const cy = originY + (imgH - (b.y0 + b.y1) / 2) * metersPerPx;
      dummy.position.set(cx, 0, -cy);
      dummy.scale.set(sx, height, sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [boxes, color, height, heightPx, metersPerPx, originX, originY]);

  useEffect(() => {
    invalidate();
    return () => {
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material | undefined)?.dispose();
      mesh?.dispose();
    };
  }, [mesh, invalidate]);

  return mesh ? <primitive object={mesh} /> : null;
};

export default MapWalls3D;
