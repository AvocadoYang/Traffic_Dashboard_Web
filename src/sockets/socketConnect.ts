import socketIO from "socket.io-client";
import { MISSION_CONTROL_WS_URL } from "@/configs/config";

export const io = socketIO(
  `${window.location.origin.replace("5173", "4000")}/dashboard`
);
