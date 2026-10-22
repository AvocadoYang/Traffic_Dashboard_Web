/**
 * 可以重現的亂數 (mulberry32): 同一個種子每次都得到一樣的序列, 回放才能用同一個種子重算.
 * 每一列搬運需求各用一個由 (種子, 列的順序) 算出來的亂數, 加一列不會打亂別列的時間.
 */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 兩個整數混成一個種子 */
export function mixSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** 指數分布 (平均 1/rate), 卜瓦松到達的間隔 */
export const expSample = (rng: Rng, rate: number) => -Math.log(1 - rng()) / rate;
