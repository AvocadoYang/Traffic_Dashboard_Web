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

export default client;
