import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import client from "./axiosClient";

/** 個人設定 (後端 /api/profile)。格式跟後端 routers/profile/preferences.ts 一致 */

export type AvatarChoice = { icon: string; color: string };

export type AlarmType = "error" | "warn" | "success" | "info";

export type MapLayerPrefs = {
  location?: boolean;
  road?: boolean;
  pointCloud?: boolean;
  annotation?: boolean;
  zones?: boolean;
};

/** 地圖預設視角: 畫面中心在底圖上的位置 (像素) + 縮放 */
export type MapViewPref = { mapId: string; scale: number; cx: number; cy: number };

export type NotifyPrefs = {
  types?: Partial<Record<AlarmType, boolean>>;
  mutedCodes?: number[];
  sound?: Partial<Record<AlarmType, boolean>>;
  volume?: number;
  dedupeSeconds?: number;
};

export type FavoriteMission = {
  id: string;
  titleId: string;
  amrId?: string | null;
  priority?: number;
  label?: string;
};

export type UserPreferences = {
  homePage?: string;
  theme?: string;
  language?: "en" | "tw";
  fontScale?: number;
  map?: { layers?: MapLayerPrefs; view?: MapViewPref | null };
  notify?: NotifyPrefs;
  favorites?: FavoriteMission[];
  idleLogoutMinutes?: number;
};

export type Role = "GENERALLY" | "ENGINEER" | "ADMIN";

export type MyProfile = {
  id: string;
  account: string;
  role: Role;
  avatar: AvatarChoice | null;
  preferences: UserPreferences;
};

/** 預設首頁可以選的頁面 (跟後端 HOME_PAGES 一樣) */
export const HOME_PAGES = [
  "/",
  "/amr",
  "/cargo-history",
  "/setting-v3",
  "/records",
  "/mission-dispatch",
  "/report",
  "/profile",
] as const;

export const PROFILE_KEY = ["profile", "me"] as const;
export const AVATARS_KEY = ["profile", "avatars"] as const;

const hasToken = () => {
  try {
    return !!localStorage.getItem("token");
  } catch {
    return false;
  }
};

export const useMyProfile = () =>
  useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => (await client.get<MyProfile>("api/profile/me")).data,
    enabled: hasToken(),
    staleTime: 60_000,
    // 每分鐘重抓: 別台電腦改的偏好跟過來, 帳號被停用 / 刪掉時 (401) 也會被登出
    refetchInterval: 60_000,
    retry: false,
  });

/**
 * 存頭像 / 偏好。preferences 只送要改的欄位, 後端合併 (map / notify 往下合併一層)。
 * 先改畫面再送, 失敗就還原。
 */
export const useSaveProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { avatar?: AvatarChoice | null; preferences?: UserPreferences }) =>
      (await client.patch<Pick<MyProfile, "avatar" | "preferences">>("api/profile/me", patch)).data,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: PROFILE_KEY });
      const prev = qc.getQueryData<MyProfile>(PROFILE_KEY);
      if (prev) {
        const p = patch.preferences ?? {};
        qc.setQueryData<MyProfile>(PROFILE_KEY, {
          ...prev,
          ...("avatar" in patch ? { avatar: patch.avatar ?? null } : {}),
          preferences: {
            ...prev.preferences,
            ...p,
            ...(p.map ? { map: { ...prev.preferences.map, ...p.map } } : {}),
            ...(p.notify ? { notify: { ...prev.preferences.notify, ...p.notify } } : {}),
          },
        });
      }
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(PROFILE_KEY, ctx.prev);
    },
    onSuccess: (saved, patch) => {
      qc.setQueryData<MyProfile>(PROFILE_KEY, (old) => (old ? { ...old, ...saved } : old));
      if ("avatar" in patch) void qc.invalidateQueries({ queryKey: AVATARS_KEY });
    },
  });
};

/** 所有帳號的頭像 {帳號: 頭像}; 紀錄旁邊顯示用 */
export const useAvatars = () =>
  useQuery({
    queryKey: AVATARS_KEY,
    queryFn: async () => (await client.get<Record<string, AvatarChoice>>("api/profile/avatars")).data,
    enabled: hasToken(),
    staleTime: 5 * 60_000,
    retry: false,
  });

export type MyMission = {
  id: string;
  amrId: string;
  status: number;
  name: string;
  createdAt: string | null;
  completedAt: string | null;
  clientName: string | null;
};

export const useMyMissions = () =>
  useQuery({
    queryKey: ["profile", "my-missions"],
    queryFn: async () =>
      (await client.get<{ missions: MyMission[] }>("api/profile/my-missions")).data.missions,
    refetchInterval: 30_000,
  });

// ------------------------------------------------------------------ 帳號管理

export type AccountRow = {
  id: string;
  account: string;
  role: Role;
  avatar: AvatarChoice | null;
  disabled: boolean;
  lastLoginAt: string | null;
};

export const useAccounts = (enabled: boolean) =>
  useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await client.get<{ users: AccountRow[] }>("api/logInAndOut/users")).data.users,
    enabled,
  });

export type LoginLogRow = {
  id: string;
  time: string;
  account: string;
  ok: boolean;
  reason: "no_account" | "wrong_password" | "disabled" | null;
  ip: string | null;
  clientName: string | null;
};

export const useLoginLog = (query: { account?: string; from?: string; to?: string }) =>
  useQuery({
    queryKey: ["login-log", query],
    queryFn: async () =>
      (await client.get<{ logs: LoginLogRow[] }>("api/logInAndOut/login-log", { params: query })).data.logs,
  });

// ------------------------------------------------------------------ 交班留言

export type ShiftNote = {
  id: string;
  time: string;
  account: string;
  content: string;
  unread: boolean;
  canDelete: boolean;
};

export const SHIFT_NOTES_KEY = ["shift-notes"] as const;

export const useShiftNotes = () =>
  useQuery({
    queryKey: SHIFT_NOTES_KEY,
    queryFn: async () =>
      (await client.get<{ notes: ShiftNote[]; unread: number }>("api/profile/shift-notes")).data,
    enabled: hasToken(),
    refetchInterval: 60_000,
    retry: false,
  });
