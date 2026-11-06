import socketIO from "socket.io-client";
import { getToken } from "@/utils/session";

const SOCKET_HOST = window.location.origin.replace("5173", "4000");

// 後端要登入時 (YAML API_AUTH_MODE: enforce) 連線要帶 token; 每次 (重新) 連線都拿最新的
export const io = socketIO(`${SOCKET_HOST}/dashboard`, {
  auth: (cb) => cb({ token: getToken() }),
});

/** 登入後: 還沒登入時被後端拒絕的連線不會自己重連, 要再連一次 */
export const reconnectSocket = () => {
  if (!io.connected) io.connect();
};
