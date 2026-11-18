import { FC, ReactNode } from "react";

// 成就的圖示: 自己畫的線條圖 (24x24, 顏色跟著 currentColor), 不用 emoji。
// 同一類的成就共用同一個圖案, 以 code 對應; 沒有對應的才退回後端給的字。

const glyphs: Record<string, ReactNode> = {
  // 堆高機
  forklift: (
    <>
      <path d="M3 17V8h8v9" />
      <path d="M3 12h8" />
      <path d="M11 17h2M16 20V4M16 20h4M16 9h4" />
      <circle cx="6" cy="18.5" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </>
  ),
  box: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  layers: (
    <>
      <path d="M12 4 3 9l9 5 9-5z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 17l9 5 9-5" opacity=".5" />
    </>
  ),
  road: (
    <>
      <path d="M9 3 4 21M15 3l5 18" />
      <path d="M12 4v3M12 10.5v3M12 17v3" />
    </>
  ),
  footprints: (
    <>
      <ellipse cx="8" cy="8" rx="2.4" ry="3.4" />
      <ellipse cx="16" cy="15" rx="2.4" ry="3.4" />
      <path d="M7 13.5v2M17 7.5v2" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3.5V10M12 14v6.5M3.5 12H10M14 12h6.5" />
    </>
  ),
  moon_full: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="9.5" r="1.6" />
      <circle cx="15" cy="14.5" r="2" />
      <circle cx="14.5" cy="8" r=".8" />
    </>
  ),
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  bolt: <path d="M13 2 5 13.5h6L10 22l9-12.5h-6z" />,
  battery: (
    <>
      <rect x="3" y="7" width="16" height="10" rx="2" />
      <path d="M21 10.5v3M6.5 10v4M10 10v4M13.5 10v4" />
    </>
  ),
  waves: (
    <>
      <path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-3M12 16V9M16 16v-6" />
      <path d="m7 9 4-3 3 2 5-4M16 4h3v3" />
    </>
  ),
  stopwatch: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9M9.5 3h5M12 3v3M18.5 6l1.5-1.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M16 10.5h2a2.5 2.5 0 0 1 0 5h-2.5M8 3v3M12 3v3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h14l-2.5 4L19 12H5" />
      <path d="M9 4v8M13 4v8" opacity=".5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.3 3 7.7 7 9.5 4-1.8 7-5.2 7-9.5V6z" />
      <path d="m8.8 12 2.4 2.4 4.2-4.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
      <path d="m12 12 7-7M16.5 4.5h3v3" />
    </>
  ),
  stop: (
    <>
      <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
    </>
  ),
  siren: (
    <>
      <path d="M6 18v-5a6 6 0 0 1 12 0v5" />
      <path d="M4 18h16v3H4zM12 3v2M4 6l1.5 1.5M20 6l-1.5 1.5" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v11H11l-5 4v-4H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4h3l8 4V6l-8 4z" />
      <path d="M18 9.5a4 4 0 0 1 0 5M7 14l1.5 5.5h2.5L10 15.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14" r="6" />
      <path d="m12 11 1.1 2.2 2.4.35-1.75 1.7.4 2.4L12 16.5l-2.15 1.15.4-2.4-1.75-1.7 2.4-.35z" />
      <path d="M8.5 3.5 11 9M15.5 3.5 13 9" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5 5L3.5 17.5l3 3 6.2-6.2a4 4 0 0 0 5-5l-2.5 2.5-2.2-.5-.5-2.2z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
      <circle cx="12" cy="12" r="6.5" />
    </>
  ),
  crown: (
    <>
      <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
      <path d="M5.5 19h13" />
    </>
  ),
  bell_off: (
    <>
      <path d="M6 16V11a6 6 0 0 1 9-5.2M18 11v5l2 2H4l2-2M10 20.5a2 2 0 0 0 4 0" />
      <path d="M4 4l16 16" />
    </>
  ),
  sail: (
    <>
      <path d="M12 3v14M12 4c4 2 6 6 6 11h-6M12 8c-2 1.5-4 4-4 7h4" />
      <path d="M4 18h16l-2.5 3h-11z" />
    </>
  ),
  hand: (
    <>
      <path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8" />
      <path d="M8 12 6 10.5a1.5 1.5 0 0 0-2.2 2L8 19a5 5 0 0 0 4 2h1.5a4.5 4.5 0 0 0 4.5-4.5V12" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" />
    </>
  ),
  floppy: (
    <>
      <path d="M4 4h13l3 3v13H4z" />
      <path d="M8 4v5h8V4M7 20v-6h10v6" />
    </>
  ),
};

/** 成就 code → 圖案 */
const GLYPH_OF: Record<string, keyof typeof glyphs> = {
  first_mission: "forklift",
  missions_100: "medal",
  missions_1000: "medal",
  missions_10000: "medal",
  titles_50: "wrench",
  titles_100: "gear",
  titles_200: "crown",
  cargo_100: "box",
  cargo_1000: "box",
  cargo_10000: "box",
  cargo_day_100: "layers",
  distance_10: "footprints",
  distance_100: "wheel",
  distance_1500: "road",
  distance_384400: "moon_full",
  quiet_24: "waves",
  quiet_72: "waves",
  quiet_168: "waves",
  battery_day: "battery",
  night_owl: "moon",
  lightning: "bolt",
  day_100: "chart",
  day_250: "chart",
  hour_20: "stopwatch",
  active_8: "clock",
  active_16: "coffee",
  active_24: "sun",
  marathon_day: "flag",
  zero_manual: "shield",
  dispatch_10: "target",
  dispatch_100: "target",
  dispatch_500: "target",
  dispatch_2000: "target",
  first_cancel: "stop",
  first_estop: "siren",
  chat_50: "chat",
  chat_streak_7: "megaphone",
  observer: "eye",
  sep_problem: "bell_off",
  clean_run_50: "sail",
  do_it_myself: "hand",
  weekend_warrior: "calendar",
  backup_10: "floppy",
};

export const AchievementIcon: FC<{ code: string; fallback?: string; size?: number }> = ({ code, fallback, size = 28 }) => {
  const g = glyphs[GLYPH_OF[code]];
  if (!g) return <span>{fallback}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {g}
    </svg>
  );
};
