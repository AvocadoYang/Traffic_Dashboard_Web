/** 任務前後多看幾秒 (ms), 看得到車怎麼開過來、做完怎麼離開 */
export const REPLAY_PAD_MS = 30_000;

type Span = { amrId?: string | null; startedAt?: string | Date | null; createdAt?: string | Date | null; completedAt?: string | Date | null };

const ms = (v?: string | Date | null) => {
  if (!v) return null;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : null;
};

/**
 * 從任務跳到車隊回放的連結: 開始 (沒開始就用建立時間) 前 30 秒到結束後 30 秒, 還沒結束就到現在,
 * 帶車號讓回放把這台車標出來。沒車或沒時間 (還沒派車) 回 null。
 */
export const missionReplayLink = (m: Span, now = Date.now()): string | null => {
  const from = ms(m.startedAt) ?? ms(m.createdAt);
  if (!m.amrId || from === null) return null;
  const end = ms(m.completedAt) ?? now;
  const q = new URLSearchParams({
    from: String(from - REPLAY_PAD_MS),
    to: String(Math.min(Math.max(end, from) + REPLAY_PAD_MS, now)),
    amr: m.amrId,
  });
  return `/fleet-replay?${q.toString()}`;
};

/** 網址上的回放範圍 (?from=&to=&amr=); 不合理就回 null */
export const parseReplayParams = (p: URLSearchParams): { from: number; to: number; amr: string | null } | null => {
  const from = Number(p.get("from"));
  const to = Number(p.get("to"));
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to <= from) return null;
  return { from, to, amr: p.get("amr") || null };
};
