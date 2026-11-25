import socketIO from "socket.io-client";
import { getToken } from "@/utils/session";
import { reportPossibleOutage } from "@/utils/backendStatus";

const SOCKET_HOST = window.location.origin.replace("5173", "4000");

// 後端要登入時 (YAML API_AUTH_MODE: enforce) 連線要帶 token; 每次 (重新) 連線都拿最新的
export const io = socketIO(`${SOCKET_HOST}/dashboard`, {
  auth: (cb) => cb({ token: getToken() }),
});

// 斷線 / 連不上: 先確認是不是後端真的掛了 (還沒登入被拒絕也會 connect_error, 探測會發現後端還活著)
io.on("disconnect", reportPossibleOutage);
io.on("connect_error", reportPossibleOutage);

/** 登入後: 還沒登入時被後端拒絕的連線不會自己重連, 要再連一次 */
export const reconnectSocket = () => {
  if (!io.connected) io.connect();
};
