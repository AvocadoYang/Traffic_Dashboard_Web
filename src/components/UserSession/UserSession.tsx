import { FC, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import client from "@/api/axiosClient";
import { useMyProfile, useSaveProfile, UserPreferences } from "@/api/useProfile";
import { currentThemeIdAtom, fontScaleAtom, getTheme, setThemeAtom } from "@/theme";
import { getToken, logout, tokenExpiresAt } from "@/utils/session";
import ShiftNotePopup from "./ShiftNotePopup";

/** 離過期剩多久時去換新 token */
const REFRESH_BEFORE_MS = 15 * 60_000;
const CHECK_EVERY_MS = 30_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * 已經套用過哪個帳號的偏好。放在模組層而不是 ref: App 每次重繪 (例如換語言) 都會重建
 * ProtectedRoute, 這個元件跟著重掛; 用 ref 會再套一次帳號存的舊值, 把剛換的語言蓋回去。
 * 登出會整頁重新載入, 這個值也就清掉。
 */
let appliedProfileId: string | null = null;

/** 續期也放模組層: 元件重掛 (或開發模式的 StrictMode) 時不要同時送好幾個 /refresh */
let refreshInFlight: Promise<void> | null = null;
let refreshUnsupported = false;

const isUnauthorized = (e: unknown) => (e as AxiosError | null)?.response?.status === 401;

/**
 * 登入後一直掛著 (ProtectedRoute 裡):
 * - 套用個人偏好 (主題、語言、字體), 之後在別的地方改了 (header 的語言、外觀設定) 也存回帳號
 * - 登入續期: token 快過期就換新的; 有設閒置登出的帳號, 閒置期間不續期, 時間到就登出
 * - token 真的過期、帳號被停用 / 刪掉: 回登入頁
 * - 登入後有未讀的交班留言就跳出來
 */
const UserSession: FC = () => {
  const { i18n } = useTranslation();
  const { data: profile, error } = useMyProfile();
  const save = useSaveProfile();
  const themeId = useAtomValue(currentThemeIdAtom);
  const setTheme = useSetAtom(setThemeAtom);
  const [fontScale, setFontScale] = useAtom(fontScaleAtom);

  const lastActivity = useRef(Date.now());
  const idleMinutes = profile?.preferences.idleLogoutMinutes ?? 0;
  const idleRef = useRef(idleMinutes);
  idleRef.current = idleMinutes;

  // 帳號被停用 / 刪掉 / token 無效: 後端回 401
  useEffect(() => {
    if (isUnauthorized(error)) logout("expired");
  }, [error]);

  // ------------------------------------------------ 偏好: 先套用帳號存的, 之後的變動存回去
  useEffect(() => {
    if (!profile || appliedProfileId === profile.id) return;
    const p = profile.preferences;
    if (p.theme && getTheme(p.theme).id === p.theme && p.theme !== themeId) setTheme(p.theme as never);
    if (p.language && p.language !== i18n.language) void i18n.changeLanguage(p.language);
    if (p.fontScale && p.fontScale !== fontScale) setFontScale(p.fontScale);
    appliedProfileId = profile.id;
    // 只在換帳號 (第一次拿到資料) 時套用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const language = i18n.language === "en" ? "en" : "tw";
  useEffect(() => {
    if (!profile || appliedProfileId !== profile.id) return;
    const p = profile.preferences;
    const patch: UserPreferences = {};
    if (p.theme !== themeId) patch.theme = themeId;
    if (p.language !== language) patch.language = language;
    if ((p.fontScale ?? 1) !== fontScale) patch.fontScale = fontScale;
    if (Object.keys(patch).length === 0) return;
    const timer = setTimeout(() => save.mutate({ preferences: patch }), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, language, fontScale, profile?.id]);

  // ------------------------------------------------ 續期 / 閒置登出 / 過期
  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, mark, { passive: true }));

    const tick = async () => {
      const now = Date.now();
      const idleLimit = idleRef.current > 0 ? idleRef.current * 60_000 : 0;
      if (idleLimit && now - lastActivity.current >= idleLimit) {
        logout("idle");
        return;
      }
      const token = getToken();
      const exp = tokenExpiresAt(token);
      if (!token || exp === null) return;
      if (refreshUnsupported) return;
      if (exp <= now) {
        logout("expired");
        return;
      }
      // 沒設閒置登出 = 畫面開著就一直續 (牆上的監看螢幕不會被登出)
      if (exp - now > REFRESH_BEFORE_MS || refreshInFlight) return;
      refreshInFlight = (async () => {
        try {
          const res = await client.post<{ token: string }>("api/logInAndOut/refresh");
          if (res.data?.token) localStorage.setItem("token", res.data.token);
        } catch (e) {
          if (isUnauthorized(e)) logout("expired");
          // 舊後端沒有 /refresh (404): 不續期也不因為過期登出, 跟以前一樣
          else if ((e as AxiosError | null)?.response?.status === 404) refreshUnsupported = true;
        } finally {
          refreshInFlight = null;
        }
      })();
      await refreshInFlight;
    };
    void tick();
    const timer = setInterval(() => void tick(), CHECK_EVERY_MS);
    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, mark));
    };
  }, []);

  return <ShiftNotePopup />;
};

export default UserSession;
