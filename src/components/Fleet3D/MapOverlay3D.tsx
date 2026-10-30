import { FC, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MapType } from "@/api/useMap";
import type { PaletteColors } from "@/theme";
import { Frame, drawAnnotations, drawZones } from "@/components/CanvasMap/draw";
import { buildScene } from "@/components/CanvasMap/scene";
import { toOpaque } from "@/pages/Setting/mapComponents/components/AllZones/components/ZoneHoverCard";

/**
 * 地上的區域、地圖標註: 直接拿 2D 地圖的畫法 (draw.ts) 畫在一張跟底圖一樣大的透明畫布上,
 * 當貼圖鋪在底圖上面一點點, 樣子跟 2D 完全一樣 (區域的填色、停用的斜線、標註的字和框)。
 * 區域名稱、眼睛圖示、資訊卡是 DOM (ZoneLabels3D), 才點得到。
 */

/** 貼圖最大邊長 (像素): 很大的地圖就縮小畫 */
const MAX_TEXTURE = 4096;

type Props = {
  map: MapType;
  showZones: boolean;
  hiddenZoneIds: Set<string>;
  showAnnotation: boolean;
  /** 區域資訊卡打開時, 框出它跟同地圖的關聯區域 (同 2D) */
  linked: { sourceId: string; linkedIds: Set<string> } | null;
  colors: PaletteColors;
  darkCanvas: boolean;
};

const MapOverlay3D: FC<Props> = ({ map, showZones, hiddenZoneIds, showAnnotation, linked, colors, darkCanvas }) => {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const scene = useMemo(() => buildScene(map), [map]);
  const scale = Math.min(1, MAX_TEXTURE / Math.max(map.mapWidth, map.mapHeight, 1));

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(map.mapWidth * scale));
    canvas.height = Math.max(1, Math.round(map.mapHeight * scale));
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    return t;
  }, [map.mapWidth, map.mapHeight, scale, gl]);
  useEffect(() => () => texture.dispose(), [texture]);

  const visible = (showZones && scene.zones.length > 0) || (showAnnotation && scene.annotations.length > 0);
  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const f: Frame = { ctx, view: { x: 0, y: 0, scale }, width: canvas.width, height: canvas.height, dpr: 1, colors, darkCanvas };
    if (showAnnotation) drawAnnotations(f, scene.annotations);
    if (showZones) {
      drawZones(f, scene, hiddenZoneIds);
      if (linked) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        for (const z of scene.zones) {
          if (z.id !== linked.sourceId && !linked.linkedIds.has(z.id)) continue;
          ctx.strokeStyle = toOpaque(z.color);
          ctx.lineWidth = 4 / scale;
          ctx.setLineDash(z.id === linked.sourceId ? [] : [12 / scale, 8 / scale]);
          ctx.strokeRect(z.x, z.y, z.w, z.h);
        }
        ctx.setLineDash([]);
      }
    }
    texture.needsUpdate = true;
    invalidate();
  }, [texture, scene, scale, showZones, hiddenZoneIds, showAnnotation, linked, colors, darkCanvas, invalidate]);

  if (!visible) return null;
  const w = map.mapWidth * map.mapResolution;
  const h = map.mapHeight * map.mapResolution;
  return (
    <mesh position={[map.mapOriginX + w / 2, 0.012, -(map.mapOriginY + h / 2)]} rotation-x={-Math.PI / 2} renderOrder={0}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

export default MapOverlay3D;
