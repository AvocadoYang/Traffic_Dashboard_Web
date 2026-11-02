import { FC, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { TrackHeatData } from "@/api/useTrackArchive";
import { HeatMetric, heatRgb, heatScale } from "./heatColors";

/**
 * 熱度圖: 把每個格子的熱度畫成一張貼圖 (一格一個像素, 放大時瀏覽器內插, 看起來是柔和的色塊),
 * 鋪在地圖上面一點點。完全沒車經過的格子是透明的, 底圖看得到。
 */

/** 貼圖外面多留幾格, 內插時邊緣不會被切掉 */
const PAD = 2;
/** 貼圖最大邊長 (像素); 範圍太大就放棄 (後端 cell 最小 0.25m, 一般不會超過) */
const MAX_TEXTURE = 4096;

const HeatLayer3D: FC<{ heat: TrackHeatData; metric: HeatMetric; opacity?: number }> = ({ heat, metric, opacity = 0.85 }) => {
  const invalidate = useThree((s) => s.invalidate);

  const layout = useMemo(() => {
    if (!heat.cells.length) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of heat.cells) {
      minX = Math.min(minX, c.ix);
      maxX = Math.max(maxX, c.ix);
      minY = Math.min(minY, c.iy);
      maxY = Math.max(maxY, c.iy);
    }
    const w = maxX - minX + 1 + PAD * 2;
    const h = maxY - minY + 1 + PAD * 2;
    if (w > MAX_TEXTURE || h > MAX_TEXTURE) return null;
    return { minX, maxY, w, h };
  }, [heat]);

  const texture = useMemo(() => {
    if (!layout) return null;
    const canvas = document.createElement("canvas");
    canvas.width = layout.w;
    canvas.height = layout.h;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(layout.w, layout.h);
    const { level } = heatScale(heat.cells, metric);
    for (const c of heat.cells) {
      const v = level(c);
      if (v <= 0) continue;
      const [r, g, b] = heatRgb(v);
      // 畫布的第 0 列在上面 = 世界座標 y 最大的那一列
      const px = c.ix - layout.minX + PAD;
      const py = layout.maxY - c.iy + PAD;
      const i = (py * layout.w + px) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      // 很冷的格子淡一點, 熱的不透明
      img.data[i + 3] = Math.round(255 * Math.min(1, 0.25 + v * 0.9));
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }, [layout, heat, metric]);
  useEffect(() => {
    invalidate();
    return () => texture?.dispose();
  }, [texture, invalidate]);

  if (!layout || !texture) return null;
  const size = heat.cell;
  const centerX = (layout.minX - PAD + layout.w / 2) * size;
  const centerY = (layout.maxY + 1 + PAD - layout.h / 2) * size;
  return (
    <mesh position={[centerX, 0.02, -centerY]} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[layout.w * size, layout.h * size]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

export default HeatLayer3D;
