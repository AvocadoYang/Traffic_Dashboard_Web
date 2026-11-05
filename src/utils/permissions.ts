import { useCallback } from "react";
import { useMyProfile } from "@/api/useProfile";

/**
 * 功能權限: ADMIN 在帳號管理勾每個帳號可以用哪些功能。
 * key 跟後端 middleware/permissionRules.ts 的 PERMISSION_KEYS 一致;
 * 後端擋寫入 (403), 這裡藏頁面跟按鈕。頁面 (page.*) 跟設定頁的「看」(setting.*.view) 只有這裡在管。
 */
export type PermissionGroup = {
  /** i18n: permission.group.<key> */
  key: string;
  /** i18n: permission.key.<key 把 . 換成 _> */
  keys: string[];
};

const SETTING_CATEGORIES = [
  "point",
  "road",
  "zone",
  "map",
  "amr",
  "charge",
  "mission",
  "dispatch",
  "peripheral",
  "shelf",
  "cargo",
  "alarm",
  "mir",
] as const;

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "page",
    keys: [
      "page.amr",
      "page.cargo_history",
      "page.records",
      "page.dispatch_board",
      "page.fleet_replay",
      "page.report",
      "page.achievements",
      "page.simulate_v2",
      "page.setting",
    ],
  },
  {
    key: "mission",
    keys: ["mission.dispatch", "mission.cancel", "mission.redispatch", "mission.dispatch_board_edit"],
  },
  {
    key: "amr",
    keys: [
      "amr.emergency_stop",
      "amr.step",
      "amr.position",
      "amr.manual",
      "amr.charge",
      "amr.power",
      "amr.cargo",
      "amr.maintenance",
    ],
  },
  { key: "cargo", keys: ["cargo.edit"] },
  { key: "system", keys: ["system.ha", "system.records_delete", "system.sim_cars"] },
];

/** 設定頁: 一個分類一列, 看 / 改兩個勾 */
export const SETTING_PERMISSION_ROWS: { category: string; view?: string; edit?: string }[] = [
  ...SETTING_CATEGORIES.map((c) => ({ category: c, view: `setting.${c}.view`, edit: `setting.${c}.edit` })),
  // 備份、還原、重開後端: 只有「改」
  { category: "system", edit: "setting.system.edit" },
  // 設定變更紀錄: 只有「看」
  { category: "change_log", view: "setting.change_log.view" },
];

export const ALL_PERMISSION_KEYS: string[] = [
  ...PERMISSION_GROUPS.flatMap((g) => g.keys),
  ...SETTING_PERMISSION_ROWS.flatMap((r) => [r.view, r.edit].filter((k): k is string => !!k)),
];

/** i18n key 的名稱 (. 不能直接放在 key 裡) */
export const permissionLabelKey = (key: string) => `permission.key.${key.replace(/\./g, "_")}`;

/** 設定頁左側分類 (navItems 的 key) -> 看這個分類要的權限; 沒列的 (外觀) 大家都看得到 */
export const SETTING_NAV_VIEW_PERMISSION: Record<string, string> = {
  location: "setting.point.view",
  road: "setting.road.view",
  zone: "setting.zone.view",
  map_setting: "setting.map.view",
  amr: "setting.amr.view",
  charge: "setting.charge.view",
  mission: "setting.mission.view",
  dispatch: "setting.dispatch.view",
  peripheral: "setting.peripheral.view",
  shelve: "setting.shelf.view",
  cargo: "setting.cargo.view",
  alarm: "setting.alarm.view",
  records: "setting.change_log.view",
  mir: "setting.mir.view",
};

/** 網址 -> 進這一頁要的權限; 首頁、個人設定大家都能進 */
export const PAGE_PERMISSION: [RegExp, string][] = [
  [/^\/amr(\/|$)/, "page.amr"],
  [/^\/cargo-history$/, "page.cargo_history"],
  [/^\/records$/, "page.records"],
  [/^\/mission-dispatch$/, "page.dispatch_board"],
  [/^\/fleet-replay$/, "page.fleet_replay"],
  [/^\/report$/, "page.report"],
  [/^\/achievements$/, "page.achievements"],
  [/^\/simulate-v2$/, "page.simulate_v2"],
  [/^\/setting(-v\d)?$/, "page.setting"],
];

export const pagePermissionOf = (path: string): string | undefined =>
  PAGE_PERMISSION.find(([re]) => re.test(path))?.[1];

/**
 * can(key): 目前登入的帳號能不能用。
 * 還在讀、或後端是舊版沒回 permissions 的, 當作可以 (跟加這功能以前一樣; 真的不行後端會擋)。
 */
export const usePermission = () => {
  const { data } = useMyProfile();
  const list = data?.permissions;
  return useCallback((key: string) => !list || list.includes(key), [list]);
};
