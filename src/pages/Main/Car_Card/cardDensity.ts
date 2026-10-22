import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/**
 * 車輛卡片的顯示密度:
 * - compact  最小化,一台車一行,只留車號 / 位置 / 電量
 * - normal   正常大小
 * - detailed 最大化,連座標、目的地、異常訊息都直接攤開
 */
export const CAR_CARD_DENSITIES = ["compact", "normal", "detailed"] as const;
export type CarCardDensity = (typeof CAR_CARD_DENSITIES)[number];

const DEFAULT_DENSITY: CarCardDensity = "normal";

const isDensity = (value: unknown): value is CarCardDensity =>
  CAR_CARD_DENSITIES.includes(value as CarCardDensity);

// 記在 localStorage,重新整理後維持上次選的排列方式
const storedDensityAtom = atomWithStorage<CarCardDensity>(
  "fleet-car-card-density",
  DEFAULT_DENSITY,
  undefined,
  { getOnInit: true },
);

/** storage 裡如果是認不得的值(舊版本、被手動改過)就退回正常大小 */
export const carCardDensityAtom = atom(
  (get) => {
    const stored = get(storedDensityAtom);
    return isDensity(stored) ? stored : DEFAULT_DENSITY;
  },
  (_get, set, density: CarCardDensity) => {
    set(storedDensityAtom, density);
  },
);
