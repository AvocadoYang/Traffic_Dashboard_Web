import type { TFunction } from "i18next";

/** 後端隨任務列表送來的預計時間 (毫秒時間戳) */
export type EtaFields = {
  etaFinishAt?: number;
  etaStartAt?: number;
  /** 估得比較粗 (排隊中、缺歷史資料) */
  etaApprox?: boolean;
};

const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

/** 剩下多久: 「3 分鐘」、「1 小時 5 分」; 不到 1 分鐘是「即將完成」 */
export const etaLeft = (finishAt: number, now: number, t: TFunction) => {
  const mins = Math.round((finishAt - now) / 60_000);
  if (mins < 1) return t("eta.soon");
  if (mins < 60) return t("eta.minutes", { n: mins });
  return t("eta.hours", { h: Math.floor(mins / 60), m: mins % 60 });
};

/** 任務列表用: 「約 3 分鐘 (14:32)」, 排隊中的再加「14:28 開始」; 沒有 ETA 回 null */
export const etaText = (eta: EtaFields, now: number, t: TFunction) => {
  if (!eta.etaFinishAt) return null;
  const approx = eta.etaApprox ? `${t("eta.approx")} ` : "";
  const main = `${approx}${etaLeft(eta.etaFinishAt, now, t)} (${hhmm(eta.etaFinishAt)})`;
  const start = eta.etaStartAt ? t("eta.starts", { time: hhmm(eta.etaStartAt) }) : null;
  return { main, start };
};
