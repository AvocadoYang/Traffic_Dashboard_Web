import axios from "axios";
import { MISSION_CONTROL_URL } from "../configs/config";
import i18next from "i18next";
import { clientIdentityHeaders } from "../utils/clientIdentity";
import { getToken, logout } from "../utils/session";

/** 跟 utils/permissions 的 permissionLabelKey 一樣; 設定頁的 key 用分類名 + 看 / 改 */
const permissionLabelKeyOf = (key: string) => {
  const m = /^setting\.([a-z_]+)\.(view|edit)$/.exec(key);
  return m ? `permission.setting.${m[1]}` : `permission.key.${key.replace(/\./g, "_")}`;
};
// console.log(MISSION_CONTROL_URL, '@@@@@@')
// console.log(
//   MISSION_CONTROL_URL.replace('localhost', location.host).replace('5173', '4000'),
//   '####################'
// )
const client = axios.create({
  baseURL: `${window.location.origin.replace("5173", "4000")}`,
});

client.interceptors.request.use((config: any) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // 讓後端知道是哪一台電腦送的 (同帳號多台電腦登入時分得出來)
  Object.assign(config.headers, clientIdentityHeaders());
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    // 功能權限: 後端回 403 { permission } 時, 把訊息換成看得懂的那一項名稱,
    // 各畫面原本顯示 response.data.message 的地方就會顯示這句
    const data = err?.response?.data;
    if (err?.response?.status === 403 && data && typeof data.permission === "string") {
      const t = i18next.t as (key: string, opt?: Record<string, unknown>) => string;
      const text = t("permission.denied", { name: t(permissionLabelKeyOf(data.permission)) });
      // 翻譯還沒載入 (i18next 還沒 init) 就留後端的原文
      if (text) data.message = text;
    }
    // 後端要登入 (API_AUTH_MODE: enforce) 而 token 過期 / 失效: 回登入頁
    if (err?.response?.status === 401 && data?.code === "LOGIN_REQUIRED" && getToken()) {
      logout("expired");
    }
    // if (err.response?.status === 401) {
    //   localStorage.removeItem("token");
    //   window.location.href = "/login";
    // }
    return Promise.reject(err);
  }
);

export default client;
