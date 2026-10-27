import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PALLET_HEIGHT } from "./dimensions";

/**
 * 3D 檢視共用的模型和材質: 叉車、棧板、紙箱。
 * 模型放在 public/models (叉車由 scripts/forklift-model 產生, 棧板是同事 glb-editor 那包的原檔)。
 */

const MODEL_BASE = `${import.meta.env.BASE_URL}models/`;
export const FORKLIFT_URL = `${MODEL_BASE}forklift.glb`;
export const PALLET_URL = `${MODEL_BASE}pallet.glb`;
// 不用 Draco: 解碼器要從 CDN 抓, 工廠內網常常連不到; meshopt 解碼器是內建的
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
