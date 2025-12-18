import axios from "axios";
import { MISSION_CONTROL_URL } from "../configs/config";
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
