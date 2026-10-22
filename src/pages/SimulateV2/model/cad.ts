/** CAD 圖 (DXF) 的單位換算 */
import type { CadUnit } from "./types";

export const CAD_UNITS: CadUnit[] = ["mm", "cm", "m", "in", "ft"];

/** 一個單位是幾公尺 */
export const CAD_UNIT_METERS: Record<CadUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
};

/**
 * DXF 檔頭的 $INSUNITS 代碼 -> 單位: 1 英吋、2 英尺、4 公釐、5 公分、6 公尺.
 * 沒寫 (0) 或其他很少見的 (公寸、英里…) 回 null, 當作沒寫.
 */
export function unitFromInsunits(code: number | null | undefined): CadUnit | null {
  switch (code) {
    case 1:
      return "in";
    case 2:
      return "ft";
    case 4:
      return "mm";
    case 5:
      return "cm";
    case 6:
      return "m";
    default:
      return null;
  }
}

/**
 * 沒寫單位時用圖面大小猜: 工廠通常幾十到幾百公尺, 圖面寬度超過 2000 多半是公釐, 不然當公尺.
 * 猜的只是預設值, 匯入時使用者可以改, 也可以兩點校正.
 */
export function guessUnit(width: number, height: number): CadUnit {
  return Math.max(width, height) > 2000 ? "mm" : "m";
}
