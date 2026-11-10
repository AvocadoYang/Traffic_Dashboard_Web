import { jwtDecode } from "jwt-decode";

/**
 * 登入狀態: token 什麼時候過期、登出、登出的原因。
 * 登入頁讀 ?reason= 顯示為什麼被登出。
 */
export type LogoutReason = "idle" | "expired" | "disabled";

/** 剛登入, 要看聊天室有沒有未讀 (登入頁設, 聊天室看完清掉) */
export const CHAT_CHECK_KEY = "chat-unread-check";

export const getToken = (): string | null => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

/** token 過期時間 (ms); 解不開就 null */
export const tokenExpiresAt = (token: string | null): number | null => {
  if (!token) return null;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
};

/** 用預設密碼登入、而且沒在略過期間的 token (後端標 pwr): 跳「建議修改預設密碼」 */
export const tokenPasswordReminder = (token: string | null): boolean => {
  if (!token) return false;
  try {
    return jwtDecode<{ pwr?: boolean }>(token).pwr === true;
  } catch {
    return false;
  }
};

export const tokenAccount = (token: string | null): string => {
  if (!token) return "";
  try {
    return jwtDecode<{ username?: string }>(token).username ?? "";
  } catch {
    return "";
  }
};

/** 登出並回登入頁。整頁重新載入, 上一個帳號的資料 (react-query 快取) 不會留給下一個人 */
export const logout = (reason?: LogoutReason) => {
  try {
    localStorage.removeItem("token");
    sessionStorage.removeItem(CHAT_CHECK_KEY);
  } catch {
    /* storage 被擋就只能靠重新載入 */
  }
  window.location.assign(reason ? `/login?reason=${reason}` : "/login");
};
