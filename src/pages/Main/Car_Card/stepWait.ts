/** 這一動超過多久還沒做完, 就提示「車端可能已完成但沒回報」 */
export const STEP_WAIT_WARN_MS = 3 * 60 * 1000;

export const formatWait = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
};
