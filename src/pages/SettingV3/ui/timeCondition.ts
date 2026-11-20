import dayjs, { Dayjs } from "dayjs";
import type { TFunction } from "i18next";

/** 1 = 星期一 ... 7 = 星期日 (跟後端 helpers/timeWindow.ts 一樣) */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const TIME_FORMAT = "HH:mm";

export const weekdayOptions = (t: TFunction) =>
  WEEKDAYS.map((d) => ({ value: d, label: t(`time_condition.day_short.${d}`) }));

export const toDayjs = (hhmm: string | null | undefined): Dayjs | null =>
  hhmm ? dayjs(hhmm, TIME_FORMAT) : null;

export const toHhmm = (value: Dayjs | null | undefined): string | null =>
  value ? value.format(TIME_FORMAT) : null;

/** 「星期一、三、五 08:00–17:00」/「每天 22:00–06:00 (跨午夜)」; 都沒設回 null */
export function describeTimeWindow(
  t: TFunction,
  days: number[] | null | undefined,
  from: string | null | undefined,
  to: string | null | undefined,
): string | null {
  const hasDays = !!days && days.length > 0 && days.length < 7;
  const hasTime = !!from && !!to;
  if (!hasDays && !hasTime) return null;

  const dayText = hasDays
    ? t("time_condition.days_prefix") +
      [...days].sort().map((d) => t(`time_condition.day_short.${d as Weekday}`)).join("、")
    : t("time_condition.every_day");
  if (!hasTime) return dayText;
  const overnight = (from as string) > (to as string);
  return `${dayText} ${from}–${to}${overnight ? ` ${t("time_condition.overnight")}` : ""}`;
}
