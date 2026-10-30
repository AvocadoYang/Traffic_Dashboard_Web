import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PALLET_HEIGHT } from "./dimensions";
import { FORKLIFT_URL, PALLET_URL } from "./modelUrls";

/**
 * 3D 檢視共用的模型和材質: 叉車、MiR、M68 (SW15)、棧板、紙箱。
 * 模型放在 public/models (車由 scripts/vehicle-models 產生, 棧板是同事 glb-editor 那包的原檔), 網址在 modelUrls.ts。
 */

export { FORKLIFT_URL, M68_URL, MIR_URL, PALLET_URL } from "./modelUrls";
// 不用 Draco: 解碼器要從 CDN 抓, 工廠內網常常連不到; meshopt 解碼器是內建的。
// MiR、M68 不先載: 沒有這種車的現場用不到, 第一次畫的時候才載
useGLTF.preload(FORKLIFT_URL, false, true);
useGLTF.preload(PALLET_URL, false, true);

export const unitBox = new THREE.BoxGeometry(1, 1, 1);
export const cartonMaterial = new THREE.MeshStandardMaterial({ color: "#c8a165", roughness: 0.9 });
export const palletMaterial = new THREE.MeshStandardMaterial({ color: "#9c7a4c", roughness: 0.85 });
/** 點選用的隱形盒子 (不畫, 但點得到) */
export const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

/** 棧板的幾何 (節點的變換烤進去, 原點在底部中心) */
export const usePalletGeometry = () => {
  const { scene } = useGLTF(PALLET_URL, false, true);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    let geometry: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!geometry && mesh.isMesh) geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    });
    return geometry ?? new THREE.BoxGeometry(1, PALLET_HEIGHT, 1).translate(0, PALLET_HEIGHT / 2, 0);
  }, [scene]);
};
