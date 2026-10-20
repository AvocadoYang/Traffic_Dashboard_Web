import type { AlarmType } from "@/api/useProfile";

/**
 * 告警提示音: 用 WebAudio 合成短音, 不用音效檔。每種告警一種音型, 聽得出差別:
 * 錯誤 = 高低兩聲重複, 警告 = 兩聲, 成功 = 上揚短音, 資訊 = 一聲輕的。
 * 瀏覽器要使用者先點過頁面才能出聲 (登入時已經點過)。
 */
const PATTERNS: Record<AlarmType, { freq: number; at: number; len: number }[]> = {
  error: [
    { freq: 880, at: 0, len: 0.16 },
    { freq: 660, at: 0.2, len: 0.16 },
    { freq: 880, at: 0.4, len: 0.16 },
    { freq: 660, at: 0.6, len: 0.22 },
  ],
  warn: [
    { freq: 740, at: 0, len: 0.14 },
    { freq: 740, at: 0.22, len: 0.14 },
  ],
  success: [
    { freq: 660, at: 0, len: 0.1 },
    { freq: 990, at: 0.11, len: 0.16 },
  ],
  info: [{ freq: 560, at: 0, len: 0.14 }],
};

export const DEFAULT_VOLUME = 60;
/** 沒設過時都不響 (跟以前一樣), 要響的人自己在個人設定 > 通知打開 */
export const DEFAULT_SOUND: Record<AlarmType, boolean> = { error: false, warn: false, success: false, info: false };

let ctx: AudioContext | null = null;

export const playAlarmTone = (type: AlarmType, volume: number) => {
  const gainValue = Math.max(0, Math.min(100, volume)) / 100;
  if (gainValue === 0) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    (PATTERNS[type] ?? PATTERNS.info).forEach(({ freq, at, len }) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // 淡入淡出, 不然會有爆音
      gain.gain.setValueAtTime(0, now + at);
      gain.gain.linearRampToValueAtTime(0.4 * gainValue, now + at + 0.015);
      gain.gain.linearRampToValueAtTime(0, now + at + len);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(now + at);
      osc.stop(now + at + len + 0.02);
    });
  } catch {
    /* 沒有音效裝置之類的, 不出聲就好 */
  }
};
