import axios from "axios";
import { MISSION_CONTROL_URL } from "../configs/config";
import { clientIdentityHeaders } from "../utils/clientIdentity";
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
    // if (err.response?.status === 401) {
    //   localStorage.removeItem("token");
    //   window.location.href = "/login";
    // }
    return Promise.reject(err);
  }
);

export default client;
