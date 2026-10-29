/**
 * 內建模型的網址 (public/models, 由 scripts/vehicle-models 產生)。
 * 獨立一個檔案: 設定頁也要用, 不要因此載進 three.js (models.ts 一載就會先下載叉車模型)
 */
const MODEL_BASE = `${import.meta.env.BASE_URL}models/`;
export const FORKLIFT_URL = `${MODEL_BASE}forklift.glb`;
export const MIR_URL = `${MODEL_BASE}mir250.glb`;
export const M68_URL = `${MODEL_BASE}m68.glb`;
export const PALLET_URL = `${MODEL_BASE}pallet.glb`;
