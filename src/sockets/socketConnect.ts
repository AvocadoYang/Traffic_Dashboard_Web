import socketIO from "socket.io-client";
import { MISSION_CONTROL_WS_URL } from "@/configs/config";

const SOCKET_HOST = window.location.origin.replace("5173", "4000");

export const io = socketIO(`${SOCKET_HOST}/dashboard`);
