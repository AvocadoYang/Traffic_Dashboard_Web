import { FC, useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 地上的底圖 (現場地圖的掃圖 / 模擬的底圖), 平鋪在 y = 0。
 *
 * 跟 2D 地圖一樣可以跟著主題重新上色: 2D 是在 <img> 上掛 feColorMatrix 濾鏡 (theme/mapImage.ts),
 * 這裡把同一組矩陣放進 shader, 白 -> 主題底色、黑 -> 主題線條色。
 * 底圖從後端 (另一個 port) 來, 後端有開 CORS, 可以當貼圖用; 讀不到就只是不顯示, 不影響車。
 */

type Props = {
  url: string;
  widthPx: number;
  heightPx: number;
  /** 圖片左下角的 ROS 座標 (公尺) */
  originX: number;
  originY: number;
  metersPerPx: number;
  /** buildMapImageMatrix 算出來的 feColorMatrix values; null = 不重新上色 */
  recolor: string | null;
  opacity?: number;
};

const parseMatrix = (values: string | null) => {
  const m = new THREE.Matrix3();
  const offset = new THREE.Vector3();
  if (!values) return { m, offset };
  const v = values.trim().split(/\s+/).map(Number);
  // feColorMatrix 一列 5 個: R' = a*R + b*G + c*B + d*A + e; 只用前三列, alpha 不動
  m.set(v[0], v[1], v[2], v[5], v[6], v[7], v[10], v[11], v[12]);
  offset.set(v[4], v[9], v[14]);
  return { m, offset };
};

const MapGround: FC<Props> = ({ url, widthPx, heightPx, originX, originY, metersPerPx, recolor, opacity = 1 }) => {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let alive = true;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (!alive) {
          t.dispose();
          return;
        }
        // 不解碼 sRGB: 矩陣跟 2D 濾鏡一樣在 sRGB 空間算 (colorInterpolationFilters="sRGB"), 算完 shader 再轉線性
        t.colorSpace = THREE.NoColorSpace;
        // 放大時像素清楚 (同 2D 地圖放大後關掉平滑); 斜著看時用非等向過濾, 遠處才不會糊成一片
        t.magFilter = THREE.NearestFilter;
        t.anisotropy = gl.capabilities.getMaxAnisotropy();
        loaded = t;
        setTexture(t);
      },
      undefined,
      () => console.warn("3D 底圖載入失敗:", url),
    );
    return () => {
      alive = false;
      loaded?.dispose();
      setTexture(null);
    };
  }, [url, gl]);

  const uniforms = useMemo(() => {
    const { m, offset } = parseMatrix(null);
    return { uRecolor: { value: m }, uRecolorOffset: { value: offset } };
  }, []);

  useEffect(() => {
    const { m, offset } = parseMatrix(recolor);
    uniforms.uRecolor.value.copy(m);
    uniforms.uRecolorOffset.value.copy(offset);
    invalidate();
  }, [recolor, uniforms, invalidate]);

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform mat3 uRecolor;\nuniform vec3 uRecolorOffset;")
        .replace(
          "#include <map_fragment>",
          "#include <map_fragment>\ndiffuseColor.rgb = sRGBTransferEOTF(vec4(clamp(uRecolor * diffuseColor.rgb + uRecolorOffset, 0.0, 1.0), 1.0)).rgb;",
        );
    };
    return mat;
  }, [uniforms, opacity]);

  useEffect(() => {
    material.map = texture;
    material.needsUpdate = true;
    invalidate();
  }, [material, texture, invalidate]);
  useEffect(() => () => material.dispose(), [material]);

  if (!texture) return null;
  const w = widthPx * metersPerPx;
  const h = heightPx * metersPerPx;
  return (
    <mesh material={material} position={[originX + w / 2, 0, -(originY + h / 2)]} rotation-x={-Math.PI / 2} renderOrder={-1}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
};

export default MapGround;
