// 這台電腦 (這個瀏覽器) 的身分。同一個帳號會在好幾台電腦登入,
// 後端靠這兩個值記下任務是哪一台派的 / 取消的 (Missions.send_source / cancel_source)。
// 存在 localStorage: 跟著瀏覽器走, 換帳號登入不會變, 清掉瀏覽器資料才會重來。
const CLIENT_ID_KEY = "client_id";
const CLIENT_NAME_KEY = "client_name";

export const CLIENT_NAME_MAX_LENGTH = 40;

const newClientId = () => {
  // 用 IP 開 http 的頁面不是 secure context, 沒有 crypto.randomUUID
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getClientId = () => {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = newClientId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage 被擋掉時就不送, 後端還是會記 IP
    return "";
  }
};

export const getClientName = () => {
  try {
    return localStorage.getItem(CLIENT_NAME_KEY) ?? "";
  } catch {
    return "";
  }
};

export const setClientName = (name: string) => {
  const trimmed = name.trim().slice(0, CLIENT_NAME_MAX_LENGTH);
  try {
    if (trimmed) localStorage.setItem(CLIENT_NAME_KEY, trimmed);
    else localStorage.removeItem(CLIENT_NAME_KEY);
  } catch {
    // 存不了就維持原樣
  }
  return trimmed;
};

/** 每個 request 都帶的來源 header; 名稱可能有中文, header 只能放 ASCII 所以先編碼 */
export const clientIdentityHeaders = () => {
  const headers: Record<string, string> = {};
  const id = getClientId();
  const name = getClientName();
  if (id) headers["X-Client-Id"] = id;
  if (name) headers["X-Client-Name"] = encodeURIComponent(name);
  return headers;
};
