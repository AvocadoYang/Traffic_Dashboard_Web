import axios from "axios";

const client = axios.create({
  baseURL: `${window.location.origin.replace("5173", "4000")}`,
});

client.interceptors.request.use((config: any) => {
  const token = getCookie("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      deleteCookie("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// cookie 工具函式
export function setCookie(name: string, value: string, hours: number) {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
}

export function getCookie(name: string) {
  const cookies = document.cookie.split("; ");
  const target = cookies.find(c => c.startsWith(`${name}=`));
  return target ? target.split("=")[1] : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

export default client;