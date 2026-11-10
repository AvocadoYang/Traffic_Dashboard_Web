/** 頂部選單可排序 / 隱藏的頁面 (key = 網址, 跟後端 NAV_KEYS 一樣) 與預設順序 */
export const NAV_PAGES = [
  { key: "/", labelKey: "page_view" },
  { key: "/amr", labelKey: "page_amr" },
  { key: "/cargo-history", labelKey: "page_cargo_history" },
  { key: "/setting-v3", labelKey: "page_setting" },
  { key: "/simulate-v2", labelKey: "page_simulate_v2" },
  { key: "/records", labelKey: "page_record" },
  { key: "/mission-dispatch", labelKey: "page_mission_dispatch" },
  { key: "/fleet-replay", labelKey: "page_fleet_replay" },
  { key: "/report", labelKey: "page_report" },
  { key: "/achievements", labelKey: "page_achievements" },
] as const;

export type NavPrefs = { order?: string[]; hidden?: string[] };

/** 沒設定過時預設隱藏的頁面 */
export const DEFAULT_NAV_HIDDEN: string[] = ["/mission-dispatch"];

const DEFAULT_ORDER: string[] = NAV_PAGES.map((p) => p.key);

/** 存的順序 + 之後新增、存檔裡沒有的頁面 (接在最後) */
export const resolveNavOrder = (order?: string[]): string[] => {
  const known = (order ?? []).filter((k) => DEFAULT_ORDER.includes(k));
  const seen = new Set(known);
  return [...known, ...DEFAULT_ORDER.filter((k) => !seen.has(k))];
};

/** 依個人偏好排序並濾掉隱藏的項目 */
export const applyNavPrefs = <T extends { key: string }>(items: T[], nav?: NavPrefs): T[] => {
  const hidden = new Set(nav?.hidden ?? DEFAULT_NAV_HIDDEN);
  const rank = new Map(resolveNavOrder(nav?.order).map((k, i) => [k, i]));
  return items
    .filter((it) => !hidden.has(it.key))
    .sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
};
